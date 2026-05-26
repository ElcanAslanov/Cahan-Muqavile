"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type Direction = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
};

type ContractGroup = {
  id: string;
  direction_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
};

function makeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/Ə/g, "E")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/Ğ/g, "G")
    .replace(/Ş/g, "S")
    .replace(/Ç/g, "C")
    .replace(/İ/g, "I")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function ContractSettingsPage() {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [groups, setGroups] = useState<ContractGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [directionName, setDirectionName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedDirectionId, setSelectedDirectionId] = useState("");

  const [editingDirection, setEditingDirection] = useState<Direction | null>(
    null
  );
  const [editingGroup, setEditingGroup] = useState<ContractGroup | null>(null);

  async function loadData() {
    setLoading(true);

    const { data: directionData, error: directionError } = await supabase
      .from("contract_directions")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: groupData, error: groupError } = await supabase
      .from("contract_groups")
      .select("*")
      .order("created_at", { ascending: true });

    if (directionError || groupError) {
      alert("Məlumatlar yüklənmədi");
      setLoading(false);
      return;
    }

    setDirections(directionData || []);
    setGroups(groupData || []);

    if (!selectedDirectionId && directionData && directionData.length > 0) {
      setSelectedDirectionId(directionData[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedDirection = directions.find(
    (d) => d.id === selectedDirectionId
  );

  const selectedGroups = useMemo(() => {
    return groups.filter((g) => g.direction_id === selectedDirectionId);
  }, [groups, selectedDirectionId]);

  async function addDirection() {
    const cleanName = directionName.trim();

    if (!cleanName) {
      alert("Bölmə adını yazın");
      return;
    }

    const code = makeCode(cleanName);

    const { error } = await supabase.from("contract_directions").insert({
      name: cleanName,
      code,
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setDirectionName("");
    loadData();
  }

  async function addGroup() {
    const cleanName = groupName.trim();

    if (!selectedDirectionId) {
      alert("Əvvəl bölmə seçin");
      return;
    }

    if (!cleanName) {
      alert("Qrup adını yazın");
      return;
    }

    const code = makeCode(cleanName);

    const { error } = await supabase.from("contract_groups").insert({
      direction_id: selectedDirectionId,
      name: cleanName,
      code,
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setGroupName("");
    loadData();
  }

  async function toggleDirection(item: Direction) {
    const { error } = await supabase
      .from("contract_directions")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function toggleGroup(item: ContractGroup) {
    const { error } = await supabase
      .from("contract_groups")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function saveDirectionEdit() {
    if (!editingDirection) return;

    const cleanName = editingDirection.name.trim();

    if (!cleanName) {
      alert("Bölmə adı boş ola bilməz");
      return;
    }

    const { error } = await supabase
      .from("contract_directions")
      .update({
        name: cleanName,
        code: makeCode(cleanName),
      })
      .eq("id", editingDirection.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingDirection(null);
    loadData();
  }

  async function saveGroupEdit() {
    if (!editingGroup) return;

    const cleanName = editingGroup.name.trim();

    if (!cleanName) {
      alert("Qrup adı boş ola bilməz");
      return;
    }

    const { error } = await supabase
      .from("contract_groups")
      .update({
        name: cleanName,
        code: makeCode(cleanName),
      })
      .eq("id", editingGroup.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingGroup(null);
    loadData();
  }

  async function deleteDirection(item: Direction) {
    if (
      !confirm(
        "Bu bölməni silsəniz, ona aid qruplar da silinəcək. Davam edilsin?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("contract_directions")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedDirectionId === item.id) {
      setSelectedDirectionId("");
    }

    loadData();
  }

  async function deleteGroup(item: ContractGroup) {
    if (!confirm("Bu qrupu silmək istəyirsiniz?")) return;

    const { error } = await supabase
      .from("contract_groups")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  if (loading) {
    return (
      <div style={loadingBox}>
        <div style={loadingCard}>
          <div style={spinner} />
          <h2 style={loadingTitle}>Ayarlar yüklənir</h2>
          <p style={loadingText}>Müqavilə bölmələri və qrupları hazırlanır...</p>
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
    <div className="contract-settings-page" style={pageStyle}>
      <section className="settings-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div style={heroContent}>
          <div>
            <div style={eyebrow}>
              <span style={eyebrowDot} />
              Admin ayarları
            </div>

            <h1 style={titleStyle}>Müqavilə ayarları</h1>

            <p style={subtitleStyle}>
              Müqavilə yaradılarkən seçilən bölmə və qrupları buradan idarə
              edin. Passiv edilən bölmə və qruplar istifadəçi tərəfində
              görünməyəcək.
            </p>
          </div>

          <div style={heroMiniCard}>
            <span style={heroMiniLabel}>Bölmə</span>
            <strong style={heroMiniValue}>{directions.length}</strong>
            <span style={heroMiniHint}>ümumi bölmə sayı</span>
          </div>
        </div>
      </section>

      <section className="settings-grid" style={gridStyle}>
        <div style={cardStyle}>
          <div style={cardHeader}>
            <div>
              <h2 style={cardTitle}>Bölmələr</h2>
              <p style={cardText}>Daxili, Digər və gələcək bölmələri idarə et.</p>
            </div>
          </div>

          <div className="add-row" style={addRow}>
            <input
              value={directionName}
              onChange={(e) => setDirectionName(e.target.value)}
              placeholder="Yeni bölmə adı"
              style={inputStyle}
            />

            <button onClick={addDirection} type="button" style={primaryBtn}>
              Əlavə et
            </button>
          </div>

          <div style={listStyle}>
            {directions.map((item) => {
              const active = selectedDirectionId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    ...directionItem,
                    ...(active ? directionItemActive : {}),
                  }}
                  onClick={() => setSelectedDirectionId(item.id)}
                >
                  <div style={itemMain}>
                    <strong style={itemTitle}>{item.name}</strong>
                    <span style={itemCode}>{item.code}</span>
                  </div>

                  <div style={actions}>
                    <span style={item.is_active ? activeBadge : passiveBadge}>
                      {item.is_active ? "Aktiv" : "Passiv"}
                    </span>

                    <button
                      type="button"
                      style={smallBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDirection(item);
                      }}
                    >
                      Düzəlt
                    </button>

                    <button
                      type="button"
                      style={toggleBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDirection(item);
                      }}
                    >
                      {item.is_active ? "Passiv et" : "Aktiv et"}
                    </button>

                    <button
                      type="button"
                      style={dangerBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDirection(item);
                      }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeader}>
            <div>
              <h2 style={cardTitle}>Qruplar</h2>
              <p style={cardText}>
                Seçilmiş bölmə:
                <strong> {selectedDirection?.name || "-"}</strong>
              </p>
            </div>
          </div>

          <div className="add-row" style={addRow}>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Yeni qrup adı"
              style={inputStyle}
            />

            <button onClick={addGroup} type="button" style={primaryBtn}>
              Əlavə et
            </button>
          </div>

          <div style={listStyle}>
            {selectedGroups.length === 0 ? (
              <div style={emptyBox}>
                <div style={emptyIcon}>📭</div>
                <strong style={emptyTitle}>Qrup yoxdur</strong>
                <span style={emptyText}>Bu bölməyə qrup əlavə edin.</span>
              </div>
            ) : (
              selectedGroups.map((item) => (
                <div key={item.id} style={groupItem}>
                  <div style={itemMain}>
                    <strong style={itemTitle}>{item.name}</strong>
                    <span style={itemCode}>{item.code}</span>
                  </div>

                  <div style={actions}>
                    <span style={item.is_active ? activeBadge : passiveBadge}>
                      {item.is_active ? "Aktiv" : "Passiv"}
                    </span>

                    <button
                      type="button"
                      style={smallBtn}
                      onClick={() => setEditingGroup(item)}
                    >
                      Düzəlt
                    </button>

                    <button
                      type="button"
                      style={toggleBtn}
                      onClick={() => toggleGroup(item)}
                    >
                      {item.is_active ? "Passiv et" : "Aktiv et"}
                    </button>

                    <button
                      type="button"
                      style={dangerBtn}
                      onClick={() => deleteGroup(item)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {editingDirection && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h2 style={modalTitle}>Bölməni redaktə et</h2>

            <input
              value={editingDirection.name}
              onChange={(e) =>
                setEditingDirection({
                  ...editingDirection,
                  name: e.target.value,
                })
              }
              style={inputStyle}
            />

            <div style={modalActions}>
              <button onClick={saveDirectionEdit} style={saveBtn}>
                Yadda saxla
              </button>
              <button
                onClick={() => setEditingDirection(null)}
                style={cancelBtn}
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h2 style={modalTitle}>Qrupu redaktə et</h2>

            <input
              value={editingGroup.name}
              onChange={(e) =>
                setEditingGroup({
                  ...editingGroup,
                  name: e.target.value,
                })
              }
              style={inputStyle}
            />

            <div style={modalActions}>
              <button onClick={saveGroupEdit} style={saveBtn}>
                Yadda saxla
              </button>
              <button onClick={() => setEditingGroup(null)} style={cancelBtn}>
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .contract-settings-page,
        .contract-settings-page * {
          box-sizing: border-box;
        }

        @media (max-width: 980px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .settings-hero {
            padding: 20px 16px !important;
            border-radius: 22px !important;
          }

          .add-row {
            flex-direction: column !important;
          }

          .add-row button {
            width: 100% !important;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 120px)",
};

const heroCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  padding: "28px clamp(20px, 4vw, 34px)",
  marginBottom: 20,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))",
  color: "#fff",
  boxShadow: "0 24px 80px rgba(15,23,42,0.24)",
};

const heroGlowOne: CSSProperties = {
  position: "absolute",
  width: 260,
  height: 260,
  borderRadius: "50%",
  right: -70,
  top: -90,
  background: "rgba(56,189,248,0.28)",
  filter: "blur(8px)",
};

const heroGlowTwo: CSSProperties = {
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: "50%",
  left: "35%",
  bottom: -150,
  background: "rgba(99,102,241,0.24)",
  filter: "blur(10px)",
};

const heroContent: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
};

const eyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.09)",
  color: "#dbeafe",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 14,
};

const eyebrowDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#38bdf8",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(30px, 4vw, 44px)",
  fontWeight: 950,
  letterSpacing: "-0.055em",
};

const subtitleStyle: CSSProperties = {
  margin: "12px 0 0",
  maxWidth: 760,
  color: "#cbd5e1",
  fontSize: 15,
  lineHeight: 1.7,
};

const heroMiniCard: CSSProperties = {
  minWidth: 180,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.14)",
};

const heroMiniLabel: CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 8,
};

const heroMiniValue: CSSProperties = {
  display: "block",
  color: "#fff",
  fontSize: 38,
  lineHeight: 1,
  fontWeight: 950,
};

const heroMiniHint: CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontSize: 12,
  marginTop: 8,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
  alignItems: "start",
};

const cardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  borderRadius: 26,
  padding: 20,
};

const cardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 16,
};

const cardTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 950,
};

const cardText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const addRow: CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 16,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 15,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  outline: "none",
};

const primaryBtn: CSSProperties = {
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  padding: "12px 15px",
  borderRadius: 15,
  cursor: "pointer",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const directionItem: CSSProperties = {
  padding: 14,
  borderRadius: 18,
  background: "#fff",
  border: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  flexWrap: "wrap",
};

const directionItemActive: CSSProperties = {
  border: "1px solid #93c5fd",
  background: "#eff6ff",
};

const groupItem: CSSProperties = {
  ...directionItem,
  cursor: "default",
};

const itemMain: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const itemTitle: CSSProperties = {
  color: "#0f172a",
  fontSize: 15,
  fontWeight: 950,
};

const itemCode: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const actions: CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
  alignItems: "center",
};

const activeBadge: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 12,
  fontWeight: 950,
};

const passiveBadge: CSSProperties = {
  ...activeBadge,
  background: "#f1f5f9",
  color: "#64748b",
};

const smallBtn: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  padding: "7px 10px",
  borderRadius: 11,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
};

const toggleBtn: CSSProperties = {
  ...smallBtn,
  background: "#f8fafc",
};

const dangerBtn: CSSProperties = {
  ...smallBtn,
  border: "none",
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  color: "#fff",
};

const emptyBox: CSSProperties = {
  padding: 26,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const emptyIcon: CSSProperties = {
  fontSize: 28,
};

const emptyTitle: CSSProperties = {
  color: "#0f172a",
  fontWeight: 950,
};

const emptyText: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
};

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.72)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 18,
  zIndex: 999,
  backdropFilter: "blur(10px)",
};

const modalCard: CSSProperties = {
  width: "100%",
  maxWidth: 430,
  background: "#fff",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 30px 90px rgba(0,0,0,0.3)",
};

const modalTitle: CSSProperties = {
  margin: "0 0 14px",
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 950,
};

const modalActions: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 14,
};

const saveBtn: CSSProperties = {
  flex: 1,
  border: "none",
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#fff",
  padding: "12px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 950,
};

const cancelBtn: CSSProperties = {
  flex: 1,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  padding: "12px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 950,
};

const loadingBox: CSSProperties = {
  minHeight: "calc(100vh - 120px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const loadingCard: CSSProperties = {
  width: "100%",
  maxWidth: 380,
  background: "#fff",
  borderRadius: 26,
  padding: 28,
  textAlign: "center",
};

const spinner: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  margin: "0 auto 18px",
  border: "4px solid #e2e8f0",
  borderTopColor: "#2563eb",
  animation: "spin 0.9s linear infinite",
};

const loadingTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 950,
};

const loadingText: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 14,
};