"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { createAuditLog } from "@/lib/auditlog";

type ContractTemplate = {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  file_path: string | null;
  template_type: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

const BUCKET_NAME = "contract-templates";

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PASSIVE">("ALL");
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);

  async function loadTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Şablonlar yüklənmədi");
      setLoading(false);
      return;
    }

    setTemplates((data || []) as ContractTemplate[]);
    setLoading(false);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setTemplateType("");
    setFile(null);
  }

  function normalizeFileName(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/-+/g, "-");
  }

  async function uploadTemplateFile(selectedFile: File) {
    const safeName = normalizeFileName(selectedFile.name);
    const path = `templates/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || undefined,
      });

    if (error) throw error;
    return path;
  }

  async function openTemplateFile(template: ContractTemplate) {
    if (!template.file_path && !template.file_url) {
      alert("Bu şablonda fayl yoxdur");
      return;
    }

    if (template.file_path) {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(template.file_path, 60 * 10);

      if (error || !data?.signedUrl) {
        console.error(error);
        alert("Fayl açıla bilmədi");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (template.file_url) {
      window.open(template.file_url, "_blank", "noopener,noreferrer");
    }
  }

  async function addTemplate() {
    const cleanName = name.trim();
    const cleanType = templateType.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      alert("Şablon adını yazın");
      return;
    }

    if (!file) {
      alert("Şablon faylını seçin");
      return;
    }

    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;
      const filePath = await uploadTemplateFile(file);

      const newTemplatePayload = {
        name: cleanName,
        description: cleanDescription || null,
        template_type: cleanType || null,
        file_path: filePath,
        file_url: null,
        is_active: true,
        created_by: userId,
      };

      const { data: insertedTemplate, error } = await supabase
        .from("contract_templates")
        .insert(newTemplatePayload)
        .select("*")
        .single();

      if (error) throw error;

      await createAuditLog({
        action: "CREATE_CONTRACT_TEMPLATE",
        tableName: "contract_templates",
        recordId: insertedTemplate?.id || null,
        description: `Müqavilə şablonu yaradıldı: ${cleanName}`,
        oldData: null,
        newData: insertedTemplate || newTemplatePayload,
      });

      resetForm();
      await loadTemplates();
      alert("Şablon əlavə olundu");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Şablon əlavə olunmadı");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTemplate(item: ContractTemplate) {
    const newStatus = !item.is_active;

    const { data: updatedTemplate, error } = await supabase
      .from("contract_templates")
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      alert("Status dəyişmədi");
      return;
    }

    await createAuditLog({
      action: newStatus ? "ACTIVATE_CONTRACT_TEMPLATE" : "DEACTIVATE_CONTRACT_TEMPLATE",
      tableName: "contract_templates",
      recordId: item.id,
      description: `Şablon ${newStatus ? "aktiv edildi" : "passiv edildi"}: ${item.name}`,
      oldData: item,
      newData: updatedTemplate,
    });

    await loadTemplates();
  }

  async function saveTemplateEdit() {
    if (!editingTemplate) return;

    const cleanName = editingTemplate.name.trim();

    if (!cleanName) {
      alert("Şablon adı boş ola bilməz");
      return;
    }

    const oldTemplate = templates.find((template) => template.id === editingTemplate.id) || null;

    const updatePayload = {
      name: cleanName,
      description: editingTemplate.description?.trim() || null,
      template_type: editingTemplate.template_type?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedTemplate, error } = await supabase
      .from("contract_templates")
      .update(updatePayload)
      .eq("id", editingTemplate.id)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      alert("Şablon yenilənmədi");
      return;
    }

    await createAuditLog({
      action: "UPDATE_CONTRACT_TEMPLATE",
      tableName: "contract_templates",
      recordId: editingTemplate.id,
      description: `Müqavilə şablonu yeniləndi: ${cleanName}`,
      oldData: oldTemplate,
      newData: updatedTemplate || updatePayload,
    });

    setEditingTemplate(null);
    await loadTemplates();
  }

  async function deleteTemplate(item: ContractTemplate) {
    if (!confirm("Bu şablonu silmək istəyirsiniz?")) return;

    const { error } = await supabase.from("contract_templates").delete().eq("id", item.id);

    if (error) {
      console.error(error);
      alert("Şablon silinmədi");
      return;
    }

    if (item.file_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([item.file_path]);
      if (storageError) console.error("Template file remove error:", storageError);
    }

    await createAuditLog({
      action: "DELETE_CONTRACT_TEMPLATE",
      tableName: "contract_templates",
      recordId: item.id,
      description: `Müqavilə şablonu silindi: ${item.name}`,
      oldData: item,
      newData: null,
    });

    await loadTemplates();
  }

  function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
  }

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates
      .filter((item) => {
        if (statusFilter === "ACTIVE") return item.is_active;
        if (statusFilter === "PASSIVE") return !item.is_active;
        return true;
      })
      .filter((item) => {
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          (item.template_type || "").toLowerCase().includes(q)
        );
      });
  }, [templates, search, statusFilter]);

  const activeCount = templates.filter((item) => item.is_active).length;
  const passiveCount = templates.filter((item) => !item.is_active).length;

  if (loading) {
    return (
      <div style={loadingBox}>
        <div style={loadingCard}>
          <div style={spinner} />
          <h2 style={loadingTitle}>Şablonlar yüklənir</h2>
          <p style={loadingText}>Müqavilə şablonları hazırlanır...</p>
        </div>

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="templates-page" style={pageStyle}>
      <section className="templates-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div style={heroContent}>
          <div style={heroLeft}>
            <div style={eyebrow}>
              <span style={eyebrowDot} />
              Admin şablonları
            </div>

            <h1 className="templates-title" style={titleStyle}>
              Müqavilə şablonları
            </h1>

            <p style={subtitleStyle}>
              Müqavilə yaradılarkən istifadə olunacaq hazır fayl şablonlarını buradan əlavə edin, aktiv/passiv edin və idarə edin.
            </p>
          </div>

          <div style={heroMiniCard}>
            <span style={heroMiniLabel}>Ümumi şablon</span>
            <strong style={heroMiniValue}>{templates.length}</strong>
            <span style={heroMiniHint}>sistemdə qeydiyyatdadır</span>
          </div>
        </div>
      </section>

      <section className="templates-stats" style={statsGrid}>
        <StatCard icon="🧩" label="Bütün şablonlar" value={templates.length} />
        <StatCard icon="✅" label="Aktiv" value={activeCount} />
        <StatCard icon="⏸️" label="Passiv" value={passiveCount} />
      </section>

      <section className="templates-grid" style={gridStyle}>
        <div style={cardStyle}>
          <div style={cardHeader}>
            <div>
              <h2 style={cardTitle}>Yeni şablon əlavə et</h2>
              <p style={cardText}>Şablon faylını yükləyin. Sonra müqavilə yaratma səhifəsində seçilə biləcək.</p>
            </div>
          </div>

          <div style={formGrid}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Şablon adı" style={inputStyle} />
            <input value={templateType} onChange={(e) => setTemplateType(e.target.value)} placeholder="Tip / kateqoriya (məs: Xidmət)" style={inputStyle} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qısa açıqlama" style={textareaStyle} />

            <label style={fileBox}>
              <span style={fileIcon}>📎</span>
              <span style={fileTextWrap}>
                <strong style={fileTitle}>{file ? file.name : "Şablon faylı seç"}</strong>
                <span style={fileText}>PDF, DOC, DOCX və ya digər müqavilə faylı</span>
              </span>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
            </label>
          </div>

          <button type="button" onClick={addTemplate} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Yüklənir..." : "＋ Şablon əlavə et"}
          </button>
        </div>

        <div style={cardStyle}>
          <div style={cardHeader}>
            <div>
              <h2 style={cardTitle}>Filter</h2>
              <p style={cardText}>Şablonları status və axtarışa görə süzün.</p>
            </div>
          </div>

          <div style={filterGrid}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Şablon axtar..." style={inputStyle} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "PASSIVE")} style={inputStyle}>
              <option value="ALL">Hamısı</option>
              <option value="ACTIVE">Aktiv</option>
              <option value="PASSIVE">Passiv</option>
            </select>
            {(search || statusFilter !== "ALL") && (
              <button type="button" style={clearBtn} onClick={() => { setSearch(""); setStatusFilter("ALL"); }}>
                Təmizlə
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="templates-list-card" style={listCard}>
        <div style={listHeader}>
          <div>
            <h2 style={cardTitle}>Şablon siyahısı</h2>
            <p style={cardText}>Göstərilən nəticə: {filteredTemplates.length} / {templates.length}</p>
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div style={emptyBox}>
            <div style={emptyIcon}>📭</div>
            <strong style={emptyTitle}>Şablon tapılmadı</strong>
            <span style={emptyText}>Yeni şablon əlavə edin və ya filteri silin.</span>
          </div>
        ) : (
          <div className="templates-list" style={templateList}>
            {filteredTemplates.map((item) => (
              <div key={item.id} style={templateItem}>
                <div style={templateMain}>
                  <span style={templateAvatar}>{item.name.trim().slice(0, 1).toUpperCase()}</span>
                  <div style={templateInfo}>
                    <div style={templateTitleRow}>
                      <strong style={templateTitle}>{item.name}</strong>
                      <span style={item.is_active ? activeBadge : passiveBadge}>{item.is_active ? "Aktiv" : "Passiv"}</span>
                    </div>
                    <p style={templateDescription}>{item.description || "Açıqlama yoxdur"}</p>
                    <div style={templateMeta}>
                      <span>Tip: {item.template_type || "-"}</span>
                      <span>Tarix: {formatDate(item.created_at)}</span>
                      <span>Fayl: {item.file_path ? "Var" : "Yoxdur"}</span>
                    </div>
                  </div>
                </div>

                <div style={actions}>
                  <button type="button" style={smallBtn} onClick={() => openTemplateFile(item)}>Fayla bax</button>
                  <button type="button" style={smallBtn} onClick={() => setEditingTemplate(item)}>Düzəlt</button>
                  <button type="button" style={toggleBtn} onClick={() => toggleTemplate(item)}>{item.is_active ? "Passiv et" : "Aktiv et"}</button>
                  <button type="button" style={dangerBtn} onClick={() => deleteTemplate(item)}>Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editingTemplate && (
        <div style={modalOverlay}>
          <div className="templates-modal" style={modalCard}>
            <div style={modalHeader}>
              <div>
                <div style={modalEyebrow}><span style={modalEyebrowDot} />Redaktə</div>
                <h2 style={modalTitle}>Şablonu redaktə et</h2>
              </div>
              <button type="button" onClick={() => setEditingTemplate(null)} style={modalCloseBtn}>×</button>
            </div>

            <input value={editingTemplate.name} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="Şablon adı" style={inputStyle} />
            <input value={editingTemplate.template_type || ""} onChange={(e) => setEditingTemplate({ ...editingTemplate, template_type: e.target.value })} placeholder="Tip / kateqoriya" style={inputStyle} />
            <textarea value={editingTemplate.description || ""} onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })} placeholder="Açıqlama" style={textareaStyle} />

            <div style={modalActions}>
              <button type="button" onClick={saveTemplateEdit} style={saveBtn}>Yadda saxla</button>
              <button type="button" onClick={() => setEditingTemplate(null)} style={cancelBtn}>Bağla</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .templates-page,
        .templates-page * { box-sizing: border-box; }
        @media (max-width: 980px) { .templates-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 760px) { .templates-stats { grid-template-columns: 1fr !important; } .templates-list { gap: 12px !important; } }
        @media (max-width: 560px) { .templates-page { padding: 18px 12px 28px !important; } .templates-hero, .templates-list-card { padding: 16px 14px !important; border-radius: 20px !important; } .templates-title { font-size: 29px !important; } .templates-modal { width: 94vw !important; max-height: 90vh !important; overflow-y: auto !important; padding: 16px 12px !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div style={statCard}>
      <div style={statTop}><span style={statIconBlue}>{icon}</span><span style={statLabel}>{label}</span></div>
      <strong style={statValue}>{value}</strong>
      <span style={statHint}>şablon sayı</span>
    </div>
  );
}

const pageStyle: CSSProperties = { width: "100%", minHeight: "calc(100vh - 120px)", overflowX: "hidden", padding: "26px clamp(14px, 3vw, 32px) 38px" };
const heroCard: CSSProperties = { position: "relative", overflow: "hidden", borderRadius: 28, padding: "28px clamp(20px, 4vw, 34px)", marginBottom: 20, background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))", color: "#fff", boxShadow: "0 24px 80px rgba(15,23,42,0.24)" };
const heroGlowOne: CSSProperties = { position: "absolute", width: 260, height: 260, borderRadius: "50%", right: -70, top: -90, background: "rgba(56,189,248,0.28)", filter: "blur(8px)" };
const heroGlowTwo: CSSProperties = { position: "absolute", width: 220, height: 220, borderRadius: "50%", left: "35%", bottom: -150, background: "rgba(99,102,241,0.24)", filter: "blur(10px)" };
const heroContent: CSSProperties = { position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" };
const heroLeft: CSSProperties = { minWidth: 260, flex: "1 1 620px" };
const eyebrow: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,0.09)", color: "#dbeafe", fontSize: 13, fontWeight: 800, marginBottom: 14 };
const eyebrowDot: CSSProperties = { width: 8, height: 8, borderRadius: "50%", background: "#38bdf8" };
const titleStyle: CSSProperties = { margin: 0, fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 950, letterSpacing: "-0.055em" };
const subtitleStyle: CSSProperties = { margin: "12px 0 0", maxWidth: 760, color: "#cbd5e1", fontSize: 15, lineHeight: 1.7 };
const heroMiniCard: CSSProperties = { minWidth: 180, padding: 18, borderRadius: 22, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.14)" };
const heroMiniLabel: CSSProperties = { display: "block", color: "#cbd5e1", fontSize: 12, fontWeight: 800, marginBottom: 8 };
const heroMiniValue: CSSProperties = { display: "block", color: "#fff", fontSize: 38, lineHeight: 1, fontWeight: 950 };
const heroMiniHint: CSSProperties = { display: "block", color: "#cbd5e1", fontSize: 12, marginTop: 8 };
const statsGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 20 };
const statCard: CSSProperties = { background: "rgba(255,255,255,0.88)", border: "1px solid rgba(203,213,225,0.86)", boxShadow: "0 18px 45px rgba(15,23,42,0.08)", borderRadius: 22, padding: 18 };
const statTop: CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 };
const statIconBlue: CSSProperties = { width: 36, height: 36, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#dbeafe" };
const statLabel: CSSProperties = { color: "#475569", fontSize: 13, fontWeight: 850 };
const statValue: CSSProperties = { display: "block", color: "#0f172a", fontSize: 32, lineHeight: 1, fontWeight: 950, marginBottom: 8 };
const statHint: CSSProperties = { color: "#64748b", fontSize: 12 };
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 20, alignItems: "start", marginBottom: 20 };
const cardStyle: CSSProperties = { background: "rgba(255,255,255,0.92)", border: "1px solid rgba(203,213,225,0.9)", boxShadow: "0 24px 70px rgba(15,23,42,0.09)", borderRadius: 26, padding: 20 };
const cardHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 16 };
const cardTitle: CSSProperties = { margin: 0, color: "#0f172a", fontSize: 22, fontWeight: 950 };
const cardText: CSSProperties = { margin: "6px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.5 };
const formGrid: CSSProperties = { display: "grid", gap: 12 };
const filterGrid: CSSProperties = { display: "grid", gap: 12 };
const inputStyle: CSSProperties = { width: "100%", padding: "13px 14px", borderRadius: 15, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", outline: "none", fontSize: 14 };
const textareaStyle: CSSProperties = { ...inputStyle, minHeight: 96, resize: "vertical" };
const fileBox: CSSProperties = { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, borderRadius: 18, border: "1px dashed #94a3b8", background: "linear-gradient(135deg, rgba(248,250,252,0.95), rgba(239,246,255,0.95))", cursor: "pointer" };
const fileIcon: CSSProperties = { width: 42, height: 42, borderRadius: 15, background: "#dbeafe", color: "#1d4ed8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 };
const fileTextWrap: CSSProperties = { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 };
const fileTitle: CSSProperties = { color: "#0f172a", fontSize: 14, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const fileText: CSSProperties = { color: "#64748b", fontSize: 12 };
const primaryBtn: CSSProperties = { width: "100%", marginTop: 16, border: "none", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", padding: "13px 15px", borderRadius: 15, cursor: "pointer", fontWeight: 950, whiteSpace: "nowrap" };
const clearBtn: CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", color: "#334155", padding: "12px 14px", borderRadius: 15, cursor: "pointer", fontWeight: 900 };
const listCard: CSSProperties = { padding: 20, borderRadius: 26, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(203,213,225,0.9)", boxShadow: "0 24px 70px rgba(15,23,42,0.09)" };
const listHeader: CSSProperties = { marginBottom: 16 };
const templateList: CSSProperties = { display: "grid", gap: 14 };
const templateItem: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: 16, borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 12px 32px rgba(15,23,42,0.06)", flexWrap: "wrap" };
const templateMain: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: "1 1 420px" };
const templateAvatar: CSSProperties = { width: 44, height: 44, borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#e0f2fe", color: "#0369a1", fontWeight: 950, flexShrink: 0 };
const templateInfo: CSSProperties = { minWidth: 0, flex: 1 };
const templateTitleRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const templateTitle: CSSProperties = { color: "#0f172a", fontSize: 16, fontWeight: 950 };
const templateDescription: CSSProperties = { margin: "7px 0 0", color: "#475569", fontSize: 13, lineHeight: 1.5 };
const templateMeta: CSSProperties = { marginTop: 9, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", color: "#64748b", fontSize: 12, fontWeight: 800 };
const actions: CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" };
const activeBadge: CSSProperties = { padding: "6px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 950 };
const passiveBadge: CSSProperties = { ...activeBadge, background: "#f1f5f9", color: "#64748b" };
const smallBtn: CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", color: "#334155", padding: "8px 11px", borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 900 };
const toggleBtn: CSSProperties = { ...smallBtn, background: "#f8fafc" };
const dangerBtn: CSSProperties = { ...smallBtn, border: "none", background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff" };
const emptyBox: CSSProperties = { padding: 30, borderRadius: 20, background: "#f8fafc", border: "1px dashed #cbd5e1", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 };
const emptyIcon: CSSProperties = { fontSize: 28 };
const emptyTitle: CSSProperties = { color: "#0f172a", fontWeight: 950 };
const emptyText: CSSProperties = { color: "#64748b", fontSize: 13 };
const modalOverlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.72)", display: "flex", justifyContent: "center", alignItems: "center", padding: 18, zIndex: 999, backdropFilter: "blur(10px)" };
const modalCard: CSSProperties = { width: "100%", maxWidth: 500, background: "#fff", borderRadius: 24, padding: 20, boxShadow: "0 30px 90px rgba(0,0,0,0.3)" };
const modalHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 16 };
const modalEyebrow: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 900, marginBottom: 8 };
const modalEyebrowDot: CSSProperties = { width: 7, height: 7, borderRadius: "50%", background: "#2563eb" };
const modalTitle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 950 };
const modalCloseBtn: CSSProperties = { width: 38, height: 38, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 24 };
const modalActions: CSSProperties = { display: "flex", gap: 10, marginTop: 14 };
const saveBtn: CSSProperties = { flex: 1, border: "none", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", padding: "12px", borderRadius: 14, cursor: "pointer", fontWeight: 950 };
const cancelBtn: CSSProperties = { flex: 1, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", padding: "12px", borderRadius: 14, cursor: "pointer", fontWeight: 950 };
const loadingBox: CSSProperties = { minHeight: "calc(100vh - 120px)", display: "flex", alignItems: "center", justifyContent: "center" };
const loadingCard: CSSProperties = { width: "100%", maxWidth: 380, background: "#fff", borderRadius: 26, padding: 28, textAlign: "center" };
const spinner: CSSProperties = { width: 42, height: 42, borderRadius: "50%", margin: "0 auto 18px", border: "4px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.9s linear infinite" };
const loadingTitle: CSSProperties = { margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 950 };
const loadingText: CSSProperties = { margin: "8px 0 0", color: "#64748b", fontSize: 14 };
