"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { createAuditLog } from "@/lib/auditlog";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

type Company = {
  id: string;
  name: string;
  voen?: string | null;
};

type ContractDirection = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type ContractGroup = {
  id: string;
  direction_id: string;
  name: string;
  code: string;
  is_active: boolean;
};

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

const TEMPLATE_BUCKET = "contract-templates";


export default function CreateContract() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  const [directions, setDirections] = useState<ContractDirection[]>([]);
  const [groups, setGroups] = useState<ContractGroup[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [counterpartyVoen, setCounterpartyVoen] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("12");
  const [autoRenew, setAutoRenew] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [contractDirection, setContractDirection] = useState("");
  const [contractGroup, setContractGroup] = useState("");
  const [templateId, setTemplateId] = useState("");

  const [contractNumber, setContractNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("AZN");
  const [subject, setSubject] = useState("");
  const [generating, setGenerating] = useState(false);

  async function loadTemplates() {
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Şablonlar yüklənmədi");
      return;
    }

    const safeTemplates = (data || []) as ContractTemplate[];
    setTemplates(safeTemplates);

    if (safeTemplates.length > 0) {
      setTemplateId(safeTemplates[0].id);
    }
  }

  async function loadContractSettings() {
    const { data: directionData, error: directionError } = await supabase
      .from("contract_directions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    const { data: groupData, error: groupError } = await supabase
      .from("contract_groups")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (directionError || groupError) {
      alert("Müqavilə bölmə və qrupları yüklənmədi");
      return;
    }

    const safeDirections = directionData || [];
    const safeGroups = groupData || [];

    setDirections(safeDirections);
    setGroups(safeGroups);

    if (safeDirections.length > 0) {
      const firstDirection = safeDirections[0];
      const firstGroups = safeGroups.filter(
        (g) => g.direction_id === firstDirection.id
      );

      setContractDirection(firstDirection.code);
      setContractGroup(firstGroups[0]?.code || "");
    }
  }

  async function loadCompanies(userId: string, perms: any[]) {
    const ids = perms.filter((p) => p.can_create).map((p) => p.company_id);

    if (ids.length === 0) return;

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .in("id", ids);

    if (error) {
      console.error(error);
      alert("Şirkətlər yüklənmədi");
      return;
    }

    const safeCompanies: Company[] = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name || c.company_name || c.title || "Adsız şirkət",
      voen: c.voen || null,
    }));

    setCompanies(safeCompanies);

    if (safeCompanies.length > 0) {
      setCompanyId(safeCompanies[0].id);
    }
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      await loadContractSettings();
      await loadTemplates();

      const { data: perms } = await supabase
        .from("user_company_permissions")
        .select("*")
        .eq("user_id", userId);

      const safePerms = perms || [];
      setPermissions(safePerms);

      const canCreate = safePerms.some((p) => p.can_create);

      if (!canCreate) {
        alert("Bu səhifəyə giriş icazən yoxdur");
        window.location.href = "/company";
        return;
      }

      await loadCompanies(userId, safePerms);
    }

    init();
  }, []);

  const selectedDirection = directions.find(
    (d) => d.code === contractDirection
  );

  const filteredGroups = groups.filter(
    (g) => g.direction_id === selectedDirection?.id
  );

  const selectedGroup = filteredGroups.find((g) => g.code === contractGroup);
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const selectedCompany = companies.find((c) => c.id === companyId);
  const [manualCompanyVoen, setManualCompanyVoen] = useState("");
  const effectiveCompanyVoen = selectedCompany?.voen?.trim()
    ? selectedCompany.voen.trim()
    : manualCompanyVoen.trim();

  function calculateEndDate(start: string, months: number) {
    if (!start || isNaN(months)) return null;
    const date = new Date(start);
    if (isNaN(date.getTime())) return null;

    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  }

  async function uploadFile() {
    if (!file) return null;

    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("contracts")
      .upload(fileName, file);

    if (error) return null;

    const { data } = supabase.storage.from("contracts").getPublicUrl(fileName);
    return data.publicUrl;
  }

  function formatDateForTemplate(value: string | null) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return `${String(date.getDate()).padStart(2, "0")}.${String(
      date.getMonth() + 1
    ).padStart(2, "0")}.${date.getFullYear()}`;
  }

  async function getTemplateArrayBuffer(template: ContractTemplate) {
    if (!template.file_path && !template.file_url) {
      throw new Error("Şablon faylı tapılmadı");
    }

    if (template.file_path) {
      const { data, error } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .download(template.file_path);

      if (error || !data) {
        throw error || new Error("Şablon faylı yüklənmədi");
      }

      return await data.arrayBuffer();
    }

    const res = await fetch(template.file_url as string);

    if (!res.ok) {
      throw new Error("Şablon faylı oxunmadı");
    }

    return await res.arrayBuffer();
  }

  async function generateContractFromTemplate({
    template,
    payload,
  }: {
    template: ContractTemplate;
    payload: Record<string, any>;
  }) {
    const templateFileName = (template.file_path || template.file_url || "")
      .toString()
      .toLowerCase();

    if (!templateFileName.endsWith(".docx")) {
      return null;
    }

    const arrayBuffer = await getTemplateArrayBuffer(template);
    const zip = new PizZip(arrayBuffer);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "{{",
        end: "}}",
      },
    });

    doc.render(payload);

    const generatedBlob = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const safeCounterparty = (payload.counterparty || "muqavile")
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9ƏÖÜĞŞÇİəöüğşçı]+/g, "-")
      .replace(/-+/g, "-");

    const generatedPath = `generated/${Date.now()}-${safeCounterparty}.docx`;

    const { error } = await supabase.storage
      .from("contracts")
      .upload(generatedPath, generatedBlob, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });

    if (error) throw error;

    return generatedPath;
  }

  async function generateContractFromManualDocx({
    selectedFile,
    payload,
  }: {
    selectedFile: File;
    payload: Record<string, any>;
  }) {
    const fileName = selectedFile.name.toLowerCase();

    if (!fileName.endsWith(".docx")) {
      return null;
    }

    const arrayBuffer = await selectedFile.arrayBuffer();
    const zip = new PizZip(arrayBuffer);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "{{",
        end: "}}",
      },
    });

    doc.render(payload);

    const generatedBlob = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const safeCounterparty = (payload.counterparty || "muqavile")
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9ƏÖÜĞŞÇİəöüğşçı]+/g, "-")
      .replace(/-+/g, "-");

    const generatedPath = `generated/${Date.now()}-${safeCounterparty}.docx`;

    const { error } = await supabase.storage
      .from("contracts")
      .upload(generatedPath, generatedBlob, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });

    if (error) throw error;

    return generatedPath;
  }

  async function openTemplateFile() {
    if (!selectedTemplate?.file_path && !selectedTemplate?.file_url) {
      alert("Seçilən şablonda fayl yoxdur");
      return;
    }

    if (selectedTemplate.file_path) {
      const { data, error } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .createSignedUrl(selectedTemplate.file_path, 60 * 10);

      if (error || !data?.signedUrl) {
        console.error(error);
        alert("Şablon faylı açıla bilmədi");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (selectedTemplate.file_url) {
      window.open(selectedTemplate.file_url, "_blank", "noopener,noreferrer");
    }
  }

  async function createContract() {
    const monthCount = parseInt(duration);

    if (
      !counterparty.trim() ||
      !counterpartyVoen.trim() ||
      !companyId ||
      !startDate ||
      !contractDirection ||
      !contractGroup ||
      isNaN(monthCount) ||
      monthCount <= 0
    ) {
      alert("Zəhmət olmasa bütün xanaları düzgün doldurun");
      return;
    }

    const perm = permissions.find((p) => p.company_id === companyId);

    if (!perm || !perm.can_create) {
      alert("Bu şirkət üçün müqavilə yaratmaq icazən yoxdur");
      return;
    }

    const company = companies.find((c) => c.id === companyId);

    if (!company) {
      alert("Şirkət tapılmadı");
      return;
    }

    if (!effectiveCompanyVoen) {
      alert("Seçilən şirkətin VÖEN-i yoxdur. Zəhmət olmasa VÖEN-i əl ilə daxil edin.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const endDate = calculateEndDate(startDate, monthCount);

    setGenerating(true);

    let fileUrl: string | null = null;

    try {
      const templatePayload = {
        template_name: selectedTemplate?.name || file?.name || "",
        template_type: selectedTemplate?.template_type || "Müqavilə",
        template_kind: selectedTemplate?.template_type || "",
        created_date: formatDateForTemplate(new Date().toISOString().split("T")[0]),
        created_by: userData.user?.email || "",
        company_name: company.name,
        company_voen: effectiveCompanyVoen,
        counterparty: counterparty.trim(),
        counterparty_voen: counterpartyVoen.trim(),
        contract_number: contractNumber.trim(),
        contract_date: formatDateForTemplate(startDate),
        start_date: formatDateForTemplate(startDate),
        end_date: formatDateForTemplate(endDate),
        amount: amount.trim(),
        currency,
        status: "Aktiv",
        subject: subject.trim(),
        auto_renew: autoRenew ? "Bəli" : "Xeyr",
        duration_month: monthCount,
      };

      const templateFileName = (
        selectedTemplate?.file_path ||
        selectedTemplate?.file_url ||
        ""
      )
        .toString()
        .toLowerCase();

      if (selectedTemplate && templateFileName.endsWith(".docx")) {
        fileUrl = await generateContractFromTemplate({
          template: selectedTemplate,
          payload: templatePayload,
        });
      } else if (file && file.name.toLowerCase().endsWith(".docx")) {
        fileUrl = await generateContractFromManualDocx({
          selectedFile: file,
          payload: templatePayload,
        });
      } else if (selectedTemplate) {
        alert(
          "Seçilən şablon PDF-dir. Avtomatik doldurma üçün ya Şablonlar səhifəsində həmin şablonu DOCX kimi yenidən yüklə, ya da bu formada DOCX fayl seç."
        );
        setGenerating(false);
        return;
      } else {
        fileUrl = await uploadFile();
      }
    } catch (err: any) {
      alert(
        err?.message ||
          "Şablondan müqavilə faylı yaradılmadı. DOCX şablonunda {{...}} dəyişənlərini yoxlayın."
      );
      setGenerating(false);
      return;
    }

    setGenerating(false);

    const newContractPayload = {
      counterparty: counterparty.trim(),
      counterparty_voen: counterpartyVoen.trim(),
      company_id: companyId,
      company_name: company.name,
      company_voen: effectiveCompanyVoen,
      start_date: startDate,
      end_date: endDate,
      duration_month: monthCount,
      file_url: fileUrl,
      status: "active",
      auto_renew: autoRenew,
      created_by: userId,
      contract_direction: contractDirection,
      contract_group: contractGroup,
      template_id: selectedTemplate?.id || null,
      template_name: selectedTemplate?.name || null,
      template_file_path: selectedTemplate?.file_path || null,
      generated_file_path:
        selectedTemplate || file?.name.toLowerCase().endsWith(".docx")
          ? fileUrl
          : null,
      contract_number: contractNumber.trim() || null,
      amount: amount.trim() || null,
      currency,
      subject: subject.trim() || null,
    };

    const { data: insertedContract, error } = await supabase
      .from("contracts")
      .insert(newContractPayload)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      alert("Xəta baş verdi: " + error.message);
      return;
    }

    await createAuditLog({
      action: "CREATE_CONTRACT",
      tableName: "contracts",
      recordId: insertedContract?.id || null,
      description: `İstifadəçi yeni müqavilə yaratdı: ${newContractPayload.counterparty}`,
      oldData: null,
      newData: insertedContract || newContractPayload,
    });

    alert("Müqavilə yaradıldı");

    setCounterparty("");
    setCounterpartyVoen("");
    setManualCompanyVoen("");
    setStartDate("");
    setDuration("12");
    setAutoRenew(false);
    setFile(null);
    setTemplateId(templates[0]?.id || "");
    setContractNumber("");
    setAmount("");
    setCurrency("AZN");
    setSubject("");

    if (directions.length > 0) {
      const firstDirection = directions[0];
      const firstGroups = groups.filter(
        (g) => g.direction_id === firstDirection.id
      );

      setContractDirection(firstDirection.code);
      setContractGroup(firstGroups[0]?.code || "");
    }
  }

  function handleDirectionChange(directionCode: string) {
    const direction = directions.find((d) => d.code === directionCode);
    const directionGroups = groups.filter(
      (g) => g.direction_id === direction?.id
    );

    setContractDirection(directionCode);
    setContractGroup(directionGroups[0]?.code || "");
  }

  const monthCount = parseInt(duration);
  const previewEndDate = calculateEndDate(startDate, monthCount);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return dateStr;
    }

    return `${String(date.getDate()).padStart(2, "0")}.${String(
      date.getMonth() + 1
    ).padStart(2, "0")}.${date.getFullYear()}`;
  }

  return (
    <div className="create-contract-page" style={pageStyle}>
      <section className="create-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div className="create-hero-content" style={heroContent}>
          <div className="create-hero-left" style={heroLeft}>
            <div className="create-eyebrow" style={eyebrow}>
              <span style={eyebrowDot} />
              Yeni müqavilə
            </div>

            <h1 className="create-title" style={titleStyle}>
              Müqavilə yarat
            </h1>

            <p className="create-subtitle" style={subtitleStyle}>
              İcazəniz olan şirkətlər üçün yeni müqavilə məlumatlarını daxil
              edin, bölmə və qrup seçin, müddəti təyin edin və lazım olduqda
              müqavilə faylını əlavə edin.
            </p>
          </div>

          <div className="create-hero-mini-card" style={heroMiniCard}>
            <span style={heroMiniLabel}>Create icazəsi olan şirkət</span>
            <strong style={heroMiniValue}>{companies.length}</strong>
            <span style={heroMiniHint}>
              şirkət üzrə müqavilə yarada bilərsiniz
            </span>
          </div>
        </div>
      </section>

      <section className="create-layout" style={layoutGrid}>
        <div className="create-card" style={cardStyle}>
          <div className="create-card-header" style={cardHeader}>
            <div>
              <h2 className="create-card-title" style={cardTitle}>
                Müqavilə məlumatları
              </h2>
              <p className="create-card-text" style={cardText}>
                Bütün vacib xanaları doldurduqdan sonra müqaviləni yarada
                bilərsiniz.
              </p>
            </div>

            <span className="create-status-pill" style={statusPill}>
              Aktiv müqavilə
            </span>
          </div>

          <div className="create-form-grid" style={formGrid}>
            <div style={fieldGroup}>
              <label style={labelStyle}>Qarşı tərəf</label>
              <input
                className="create-input"
                placeholder="Məsələn: ABC MMC"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Qarşı tərəfin VÖEN-i</label>
              <input
                className="create-input"
                placeholder="Məsələn: 1234567891"
                value={counterpartyVoen}
                onChange={(e) => setCounterpartyVoen(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Şirkət</label>
              <select
                className="create-input"
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setManualCompanyVoen("");
                }}
                style={inputStyle}
              >
                {companies.length === 0 ? (
                  <option value="">Şirkət yoxdur</option>
                ) : (
                  companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Şirkətin VÖEN-i</label>
              <input
                className="create-input"
                value={selectedCompany?.voen?.trim() ? selectedCompany.voen : manualCompanyVoen}
                onChange={(e) => setManualCompanyVoen(e.target.value)}
                readOnly={!!selectedCompany?.voen?.trim()}
                placeholder={
                  selectedCompany?.voen?.trim()
                    ? "Seçilən şirkətin VÖEN-i"
                    : "VÖEN yoxdur, əl ilə daxil edin"
                }
                style={{
                  ...inputStyle,
                  background: selectedCompany?.voen?.trim() ? "#f8fafc" : "#fff",
                  color: "#0f172a",
                  cursor: selectedCompany?.voen?.trim() ? "not-allowed" : "text",
                }}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Müqavilə bölməsi</label>
              <select
                className="create-input"
                value={contractDirection}
                onChange={(e) => handleDirectionChange(e.target.value)}
                style={inputStyle}
              >
                {directions.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Müqavilə qrupu</label>
              <select
                className="create-input"
                value={contractGroup}
                onChange={(e) => setContractGroup(e.target.value)}
                style={inputStyle}
                disabled={filteredGroups.length === 0}
              >
                {filteredGroups.length === 0 ? (
                  <option value="">Bu bölmədə aktiv qrup yoxdur</option>
                ) : (
                  filteredGroups.map((g) => (
                    <option key={g.id} value={g.code}>
                      {g.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Müqavilə şablonu</label>
              <select
                className="create-input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Şablonsuz</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.template_type ? ` / ${template.template_type}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Başlama tarixi</label>
              <input
                className="create-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Müddət / ay</label>
              <input
                className="create-input"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Müqavilə nömrəsi</label>
              <input
                className="create-input"
                placeholder="Məsələn: M-001"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Məbləğ</label>
              <input
                className="create-input"
                placeholder="Məsələn: 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Valyuta</label>
              <select
                className="create-input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={inputStyle}
              >
                <option value="AZN">AZN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div style={{ ...fieldGroup, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Müqavilənin predmeti</label>
              <textarea
                className="create-input"
                placeholder="Müqavilənin predmeti..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={textareaStyle}
              />
            </div>
          </div>

          {selectedTemplate && (
            <div style={templateInfoBox}>
              <div>
                <strong style={templateInfoTitle}>Seçilən şablon</strong>
                <p style={templateInfoText}>
                  {selectedTemplate.name}
                  {selectedTemplate.template_type
                    ? ` / ${selectedTemplate.template_type}`
                    : ""}
                </p>
                <p style={templateInfoDescription}>
                  {selectedTemplate.description ||
                    "DOCX şablonunda {{company_name}}, {{company_voen}}, {{counterparty}}, {{counterparty_voen}}, {{start_date}}, {{end_date}}, {{contract_number}}, {{amount}}, {{currency}}, {{subject}} yerləri avtomatik doldurulacaq."}
                </p>
              </div>

              {(selectedTemplate.file_path || selectedTemplate.file_url) && (
                <button
                  type="button"
                  onClick={openTemplateFile}
                  style={templatePreviewBtn}
                >
                  Şablona bax
                </button>
              )}
            </div>
          )}

          <label
            className="create-renew-box"
            style={renewBox}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              style={renewCheckbox}
            />

            <span style={renewContent}>
              <strong style={renewTitle}>Avtomatik yenilənmə</strong>
              <span style={renewText}>
                Seçilərsə, müqavilə bitmə tarixindən sonra avtomatik arxivə
                düşməyəcək.
              </span>
            </span>

            <span
              style={{
                ...renewBadgeBox,
                ...(autoRenew ? renewBadgeBoxActive : {}),
              }}
            >
              {autoRenew ? "Aktiv" : "Passiv"}
            </span>
          </label>

          <div style={uploadSection}>
            <input
              type="file"
              id="fileUpload"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />

            <label
              htmlFor="fileUpload"
              className="create-upload-label"
              style={fileUploadLabel}
            >
              <span className="create-upload-icon" style={fileUploadIcon}>
                📎
              </span>

              <span className="create-upload-content" style={fileUploadContent}>
                <strong className="create-upload-title" style={fileUploadTitle}>
                  {file ? file.name : "Müqavilə faylı seç"}
                </strong>

                <span style={fileUploadText}>
                  {file
                    ? "Fayl seçildi. Müqavilə yaradılarkən yüklənəcək."
                    : selectedTemplate
                    ? "Əgər seçilən şablon PDF-disə, burada DOCX şablon faylı seçə bilərsiniz."
                    : "PDF, DOC və ya DOCX müqavilə faylını əlavə edə bilərsiniz."}
                </span>
              </span>

              <span className="create-upload-button" style={fileUploadButton}>
                Fayl seç
              </span>
            </label>
          </div>

          <button
            className="create-submit-button"
            onClick={createContract}
            type="button"
            disabled={generating}
            style={{
              ...buttonStyle,
              opacity: generating ? 0.75 : 1,
              cursor: generating ? "not-allowed" : "pointer",
            }}
          >
            <span style={buttonIcon}>＋</span>
            {generating ? "Şablon doldurulur..." : "Müqavilə yarat"}
          </button>
        </div>

        <aside className="create-preview" style={previewCard}>
          <div className="create-preview-header" style={previewHeader}>
            <span className="create-preview-icon" style={previewIcon}>
              📄
            </span>
            <div>
              <h2 className="create-preview-title" style={previewTitle}>
                Ön baxış
              </h2>
              <p style={previewText}>Daxil edilən məlumatların qısa xülasəsi</p>
            </div>
          </div>

          <div className="create-preview-list" style={previewList}>
            <div style={previewItem}>
              <span style={previewLabel}>Qarşı tərəf</span>
              <strong style={previewValue}>{counterparty || "-"}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Qarşı tərəfin VÖEN-i</span>
              <strong style={previewValue}>{counterpartyVoen || "-"}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Şirkət</span>
              <strong style={previewValue}>
                {selectedCompany?.name || "-"}
              </strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Şirkətin VÖEN-i</span>
              <strong style={previewValue}>{effectiveCompanyVoen || "-"}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Bölmə</span>
              <strong style={previewValue}>{selectedDirection?.name || "-"}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Qrup</span>
              <strong style={previewValue}>{selectedGroup?.name || "-"}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Şablon</span>
              <strong style={previewValue}>
                {selectedTemplate?.name || "Şablonsuz"}
              </strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Başlama tarixi</span>
              <strong style={previewValue}>{formatDate(startDate)}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Bitmə tarixi</span>
              <strong style={previewValue}>{formatDate(previewEndDate)}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Müddət</span>
              <strong style={previewValue}>
                {!isNaN(monthCount) && monthCount > 0
                  ? `${monthCount} ay`
                  : "-"}
              </strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Müqavilə nömrəsi</span>
              <strong style={previewValue}>{contractNumber || "-"}</strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Məbləğ</span>
              <strong style={previewValue}>
                {amount ? `${amount} ${currency}` : "-"}
              </strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Avtomatik yenilənmə</span>
              <strong style={previewValue}>
                {autoRenew ? "Bəli" : "Xeyr"}
              </strong>
            </div>

            <div style={previewItem}>
              <span style={previewLabel}>Fayl</span>
              <strong style={previewValue}>
                {file ? "Əlavə olunub" : "-"}
              </strong>
            </div>
          </div>

          <div className="create-note-box" style={noteBox}>
            <span style={noteIcon}>ℹ️</span>
            <p style={noteText}>
              Müqavilə yaradıldıqdan sonra DOCX şablon avtomatik doldurulur,
              hazır fayl müqaviləyə əlavə edilir və status aktiv saxlanılır.
            </p>
          </div>
        </aside>
      </section>

      <style jsx>{`
        .create-contract-page,
        .create-contract-page * {
          box-sizing: border-box;
        }

        @media (max-width: 1100px) {
          .create-layout {
            grid-template-columns: 1fr !important;
          }

          .create-preview {
            position: static !important;
            top: auto !important;
          }

          .create-preview-list {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 820px) {
          .create-hero {
            padding: 24px 20px !important;
            border-radius: 24px !important;
          }

          .create-hero-content {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 18px !important;
          }

          .create-hero-left {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .create-hero-mini-card {
            width: 100% !important;
            min-width: 0 !important;
          }

          .create-title {
            font-size: 32px !important;
            line-height: 1.12 !important;
          }

          .create-subtitle {
            font-size: 14px !important;
            line-height: 1.6 !important;
          }

          .create-card,
          .create-preview {
            border-radius: 22px !important;
            padding: 18px !important;
          }

          .create-card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }

          .create-status-pill {
            width: fit-content !important;
          }

          .create-form-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .create-preview-list {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .create-hero {
            padding: 22px 16px !important;
            margin-bottom: 14px !important;
            border-radius: 22px !important;
          }

          .create-eyebrow {
            font-size: 12px !important;
            padding: 6px 10px !important;
          }

          .create-title {
            font-size: 28px !important;
            letter-spacing: -0.045em !important;
          }

          .create-subtitle {
            margin-top: 10px !important;
          }

          .create-layout {
            gap: 14px !important;
          }

          .create-card,
          .create-preview {
            padding: 16px 14px !important;
            border-radius: 20px !important;
          }

          .create-card-title,
          .create-preview-title {
            font-size: 20px !important;
          }

          .create-card-text {
            font-size: 13px !important;
          }

          .create-input {
            padding: 13px 12px !important;
            font-size: 13px !important;
            border-radius: 14px !important;
            min-width: 0 !important;
          }

          .create-renew-box {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .create-upload-label {
            align-items: flex-start !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .create-upload-icon {
            width: 42px !important;
            height: 42px !important;
            border-radius: 15px !important;
          }

          .create-upload-content {
            flex: 1 1 calc(100% - 56px) !important;
            min-width: 0 !important;
          }

          .create-upload-title {
            max-width: 100% !important;
          }

          .create-upload-button {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            text-align: center !important;
          }

          .create-submit-button {
            padding: 14px 16px !important;
          }

          .create-preview-header {
            align-items: flex-start !important;
          }

          .create-note-box {
            border-radius: 16px !important;
            padding: 12px !important;
          }
        }

        @media (max-width: 380px) {
          .create-hero {
            padding: 20px 13px !important;
          }

          .create-title {
            font-size: 25px !important;
          }

          .create-card,
          .create-preview {
            padding: 14px 12px !important;
          }

          .create-input {
            font-size: 12.5px !important;
          }

          .create-preview-icon {
            width: 38px !important;
            height: 38px !important;
            border-radius: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* PAGE */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "calc(100svh - 120px)",
  overflowX: "hidden",
};

/* HERO */

const heroCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  padding: "28px clamp(20px, 4vw, 34px)",
  marginBottom: 20,
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,105,0.96) 52%, rgba(8,47,73,0.98))",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
  color: "#fff",
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
  alignItems: "center",
  justifyContent: "space-between",
  gap: 22,
  flexWrap: "wrap",
};

const heroLeft: CSSProperties = {
  minWidth: 260,
  flex: "1 1 480px",
};

const eyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.12)",
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
  boxShadow: "0 0 0 5px rgba(56,189,248,0.15)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.08,
  letterSpacing: "-0.055em",
  fontWeight: 950,
};

const subtitleStyle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: 680,
  color: "#cbd5e1",
  fontSize: 15,
  lineHeight: 1.7,
};

const heroMiniCard: CSSProperties = {
  minWidth: 190,
  padding: 18,
  borderRadius: 22,
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
  backdropFilter: "blur(14px)",
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
  letterSpacing: "-0.06em",
};

const heroMiniHint: CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontSize: 12,
  marginTop: 8,
  lineHeight: 1.45,
};

/* LAYOUT */

const layoutGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 390px)",
  gap: 20,
  alignItems: "start",
};

const cardStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  padding: 22,
  borderRadius: 26,
  backdropFilter: "blur(14px)",
};

const cardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 20,
};

const cardTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const cardText: CSSProperties = {
  margin: "7px 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};

const statusPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 11px",
  borderRadius: 999,
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const formGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const fieldGroup: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "13px 14px",
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(15,23,42,0.03)",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 96,
  resize: "vertical",
};

const templateInfoBox: CSSProperties = {
  marginTop: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 15,
  borderRadius: 20,
  background:
    "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(248,250,252,0.96))",
  border: "1px solid #bfdbfe",
  flexWrap: "wrap",
};

const templateInfoTitle: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 950,
  marginBottom: 4,
};

const templateInfoText: CSSProperties = {
  margin: 0,
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 900,
};

const templateInfoDescription: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.45,
};

const templatePreviewBtn: CSSProperties = {
  border: "1px solid #bfdbfe",
  background: "#fff",
  color: "#1d4ed8",
  padding: "9px 12px",
  borderRadius: 13,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

/* RENEW */

const renewBox: CSSProperties = {
  cursor: "pointer",
  marginTop: 18,
  display: "flex",
  alignItems: "center",
  gap: 13,
  width: "100%",
  padding: 15,
  borderRadius: 20,
  background:
    "linear-gradient(135deg, rgba(240,253,244,0.96), rgba(239,246,255,0.96))",
  border: "1px solid #bfdbfe",
};

const renewCheckbox: CSSProperties = {
  width: 18,
  height: 18,
  accentColor: "#2563eb",
  flexShrink: 0,
};

const renewContent: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const renewTitle: CSSProperties = {
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 950,
};

const renewText: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.45,
};

const renewBadgeBox: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const renewBadgeBoxActive: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
};

/* UPLOAD */

const uploadSection: CSSProperties = {
  marginTop: 18,
};

const fileUploadLabel: CSSProperties = {
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
  minWidth: 0,
  padding: 16,
  borderRadius: 20,
  border: "1px dashed #94a3b8",
  background:
    "linear-gradient(135deg, rgba(248,250,252,0.95), rgba(239,246,255,0.95))",
};

const fileUploadIcon: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: "#dbeafe",
  color: "#1d4ed8",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  flexShrink: 0,
};

const fileUploadContent: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const fileUploadTitle: CSSProperties = {
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 950,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

const fileUploadText: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.45,
};

const fileUploadButton: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #cbd5e1",
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

/* BUTTON */

const buttonStyle: CSSProperties = {
  width: "100%",
  marginTop: 18,
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "white",
  border: "none",
  padding: "14px 18px",
  borderRadius: 16,
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 950,
  boxShadow: "0 18px 34px rgba(37,99,235,0.26)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const buttonIcon: CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
};

/* PREVIEW */

const previewCard: CSSProperties = {
  width: "100%",
  minWidth: 0,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  borderRadius: 26,
  padding: 20,
  backdropFilter: "blur(14px)",
  position: "sticky",
  top: 92,
};

const previewHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 18,
};

const previewIcon: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  fontSize: 22,
  flexShrink: 0,
};

const previewTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 19,
  fontWeight: 950,
  letterSpacing: "-0.035em",
};

const previewText: CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const previewList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const previewItem: CSSProperties = {
  padding: 13,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  minWidth: 0,
};

const previewLabel: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
  marginBottom: 5,
};

const previewValue: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 950,
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const noteBox: CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 18,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const noteIcon: CSSProperties = {
  flexShrink: 0,
};

const noteText: CSSProperties = {
  margin: 0,
  color: "#1e3a8a",
  fontSize: 13,
  lineHeight: 1.55,
  fontWeight: 700,
};