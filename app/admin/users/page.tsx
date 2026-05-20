"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/password";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("COMPANY_MANAGER");

  const [newPassword, setNewPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setUsers(data);
  }

  async function loadCompanies() {
    const { data } = await supabase.from("companies").select("*");

    if (data) {
      setCompanies(data);

      const initial = data.map((c) => ({
        company_id: c.id,
        can_read: false,
        can_create: false,
        can_delete: false,
        can_archive: false,
        can_edit: false,
      }));

      setPermissions(initial);
    }
  }

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) => {
      const exists = prev.includes(id);

      const updated = exists ? prev.filter((c) => c !== id) : [...prev, id];

      if (exists) {
        setPermissions((perms) =>
          perms.map((p) =>
            p.company_id === id
              ? {
                  ...p,
                  can_read: false,
                  can_create: false,
                  can_delete: false,
                  can_archive: false,
                  can_edit: false,
                }
              : p
          )
        );
      }

      return updated;
    });
  }

  function updatePermission(index: number, key: string, value: boolean) {
    const updated = [...permissions];
    updated[index][key] = value;
    setPermissions(updated);
  }

  function applyHoldingDefaultPermissions() {
    return companies.map((c) => ({
      company_id: c.id,
      can_read: true,
      can_create: false,
      can_delete: false,
      can_archive: true,
      can_edit: false,
    }));
  }

  async function addUser() {
    let finalPermissions = permissions;

    if (role === "HOLDING_MANAGER" && selectedCompanies.length === 0) {
      finalPermissions = applyHoldingDefaultPermissions();
    }

    if (!name || !email || !password) {
      alert("Butun fieldleri doldurun");
      return;
    }

    const errorMsg = validatePassword(password);
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    if (
      (role === "COMPANY_MANAGER" || role === "ACCOUNTANT") &&
      selectedCompanies.length === 0
    ) {
      alert("Bu rol ucun en azi 1 sirket secin");
      return;
    }

    const res = await fetch("/api/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: name,
        role,
        company_ids:
          role === "COMPANY_MANAGER" ||
          role === "ACCOUNTANT" ||
          role === "HOLDING_MANAGER"
            ? selectedCompanies
            : [],
        permissions,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "User create error");
      return;
    }

    alert("User created");

    setName("");
    setEmail("");
    setPassword("");
    setRole("COMPANY_MANAGER");
    setSelectedCompanies([]);

    loadUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete user?")) return;

    await supabase.from("profiles").delete().eq("id", id);
    loadUsers();
  }

  async function changePassword() {
    if (!selectedUser || !newPassword) {
      alert("Select user and enter password");
      return;
    }

    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Password updated");
    setNewPassword("");
    setSelectedUser("");
  }

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  async function updateUser() {
    if (!editingUser) return;

    const res = await fetch("/api/update-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: editingUser.id,
        full_name: editingUser.full_name,
        role: editingUser.role,
        company_ids: selectedCompanies,
        permissions,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Update error");
      return;
    }

    alert("User updated");

    setEditingUser(null);
    loadUsers();
  }

  function openEditUser(user: any) {
    setEditingUser(user);
  }

  return (
    <div className="admin-users-page" style={pageStyle}>
      {/* HERO */}
      <section className="users-hero" style={heroCard}>
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div className="users-hero-content" style={heroContent}>
          <div className="users-hero-left" style={heroLeft}>
            <div className="users-eyebrow" style={eyebrow}>
              <span style={eyebrowDot} />
              Admin panel
            </div>

            <h1 className="users-title" style={titleStyle}>
              İstifadəçilər
            </h1>

            <p className="users-subtitle" style={subtitleStyle}>
              Sistem istifadəçilərini yaradın, rollarını təyin edin, şirkət
              icazələrini idarə edin və parollarını yeniləyin.
            </p>
          </div>

          <div className="users-hero-mini" style={heroMiniCard}>
            <span style={heroMiniLabel}>Ümumi user</span>
            <strong style={heroMiniValue}>{users.length}</strong>
            <span style={heroMiniHint}>sistemdə qeydiyyatdadır</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="users-stats" style={statsGrid}>
        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconBlue}>👥</span>
            <span style={statLabel}>İstifadəçilər</span>
          </div>
          <strong style={statValue}>{users.length}</strong>
          <span style={statHint}>Sistemdə olan bütün userlər</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconGreen}>🏢</span>
            <span style={statLabel}>Şirkətlər</span>
          </div>
          <strong style={statValue}>{companies.length}</strong>
          <span style={statHint}>İcazə verilə bilən şirkətlər</span>
        </div>

        <div style={statCard}>
          <div style={statTop}>
            <span style={statIconPurple}>🛡️</span>
            <span style={statLabel}>Permission</span>
          </div>
          <strong style={statValue}>{selectedCompanies.length}</strong>
          <span style={statHint}>Hazırda seçilmiş şirkətlər</span>
        </div>
      </section>

      <section className="users-layout" style={layoutGrid}>
        {/* CREATE USER */}
        <div className="users-card" style={cardStyle}>
          <div style={cardHeader}>
            <div>
              <h2 style={cardTitle}>Yeni user yarat</h2>
              <p style={cardText}>
                User məlumatlarını daxil edin, rol seçin və şirkət
                icazələrini təyin edin.
              </p>
            </div>

            <span style={statusPill}>Yeni user</span>
          </div>

          <div className="users-form-grid" style={formGrid}>
            <input
              placeholder="Tam ad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Parol"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (
                  e.target.value !== "COMPANY_MANAGER" &&
                  e.target.value !== "ACCOUNTANT"
                ) {
                  setSelectedCompanies([]);
                }
              }}
              style={inputStyle}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="COMPANY_MANAGER">Şirkət Meneceri</option>
              <option value="HOLDING_MANAGER">Holding Rəhbəri</option>
              <option value="ACCOUNTANT">Mühasib</option>
            </select>
          </div>

          {(role === "COMPANY_MANAGER" ||
            role === "ACCOUNTANT" ||
            role === "HOLDING_MANAGER") && (
            <div style={companySelectBox}>
              <div style={smallTitle}>Şirkət seçin</div>

              <div className="users-company-checks" style={companyChecks}>
                {companies.map((c) => (
                  <label
                    key={c.id}
                    className="users-check-card"
                    style={{
                      ...checkCard,
                      ...(selectedCompanies.includes(c.id)
                        ? checkCardActive
                        : {}),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={permissionBox}>
            <div style={smallTitle}>İcazələr</div>

            <div style={tableWrap}>
              <table style={permissionTable}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thStyle}>Şirkət</th>
                    <th style={thStyle}>Baxmaq</th>
                    <th style={thStyle}>Yaratmaq</th>
                    <th style={thStyle}>Silmək</th>
                    <th style={thStyle}>Arxiv</th>
                    <th style={thStyle}>Redaktə</th>
                  </tr>
                </thead>

                <tbody>
                  {companies.map((c, i) => (
                    <tr key={c.id} style={tbodyRow}>
                      <td style={tdStyle}>
                        <strong>{c.name}</strong>
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          disabled={!selectedCompanies.includes(c.id)}
                          checked={
                            selectedCompanies.includes(c.id) &&
                            permissions[i]?.can_read
                          }
                          onChange={(e) =>
                            updatePermission(i, "can_read", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          disabled={!selectedCompanies.includes(c.id)}
                          checked={
                            selectedCompanies.includes(c.id) &&
                            permissions[i]?.can_create
                          }
                          onChange={(e) =>
                            updatePermission(i, "can_create", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          disabled={!selectedCompanies.includes(c.id)}
                          checked={
                            selectedCompanies.includes(c.id) &&
                            permissions[i]?.can_delete
                          }
                          onChange={(e) =>
                            updatePermission(i, "can_delete", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          disabled={!selectedCompanies.includes(c.id)}
                          checked={
                            selectedCompanies.includes(c.id) &&
                            permissions[i]?.can_archive
                          }
                          onChange={(e) =>
                            updatePermission(i, "can_archive", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          disabled={!selectedCompanies.includes(c.id)}
                          checked={permissions[i].can_edit}
                          onChange={(e) =>
                            updatePermission(i, "can_edit", e.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={addUser} style={primaryButton} type="button">
            ＋ Əlavə et
          </button>
        </div>

        {/* PASSWORD CHANGE */}
        <div className="users-card" style={cardStyle}>
          <div style={cardHeader}>
            <div>
              <h2 style={cardTitle}>Parolu dəyiş</h2>
              <p style={cardText}>
                Mövcud user seçin və ona yeni parol təyin edin.
              </p>
            </div>

            <span style={greenPill}>Security</span>
          </div>

          <div style={passwordBox}>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={inputStyle}
            >
              <option value="">İstifadəçi seçin</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>

            <input
              placeholder="Yeni parol"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />

            <button onClick={changePassword} style={successButton} type="button">
              🔒 Parolu dəyiş
            </button>
          </div>
        </div>
      </section>

      {/* USERS LIST */}
      <section className="users-list-card" style={listCard}>
        <div style={listHeader}>
          <div>
            <h2 style={cardTitle}>User siyahısı</h2>
            <p style={cardText}>Göstərilən nəticə: {users.length}</p>
          </div>
        </div>

        <div className="users-grid" style={usersGrid}>
          {users.map((user) => (
            <div key={user.id} className="user-item" style={userItem}>
              <div style={userLeft}>
                <span style={userAvatar}>
                  {user.full_name?.trim().slice(0, 1).toUpperCase() || "U"}
                </span>

                <div style={userInfo}>
                  <div style={userName}>{user.full_name}</div>
                  <div style={userEmail}>{user.email}</div>
                  <span style={roleBadge}>{user.role}</span>
                </div>
              </div>

              <div className="user-actions" style={userActions}>
                <button
                  onClick={() => deleteUser(user.id)}
                  style={deleteButton}
                  type="button"
                >
                  Sil
                </button>

                <button
                  onClick={() => openEditUser(user)}
                  style={editButton}
                  type="button"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EDIT MODAL */}
      {editingUser && (
        <div style={modalOverlay}>
          <div className="users-modal" style={modalCard}>
            <div style={modalHeader}>
              <div>
                <div style={modalEyebrow}>
                  <span style={modalEyebrowDot} />
                  Redaktə
                </div>
                <h2 style={modalTitle}>Edit User</h2>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                style={modalCloseButton}
                type="button"
              >
                ×
              </button>
            </div>

            <input
              value={editingUser.full_name}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  full_name: e.target.value,
                })
              }
              placeholder="Full name"
              style={modalInput}
            />

            <input value={editingUser.email} disabled style={modalInput} />

            <select
              value={editingUser.role}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  role: e.target.value,
                })
              }
              style={modalInput}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="COMPANY_MANAGER">COMPANY_MANAGER</option>
              <option value="HOLDING_MANAGER">HOLDING_MANAGER</option>
              <option value="ACCOUNTANT">ACCOUNTANT</option>
            </select>

            <div style={modalSection}>
              <div style={smallTitle}>Şirkət seç</div>

              <div style={companyChecks}>
                {companies.map((c) => (
                  <label
                    key={c.id}
                    style={{
                      ...checkCard,
                      ...(selectedCompanies.includes(c.id)
                        ? checkCardActive
                        : {}),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={tableWrap}>
              <table style={permissionTable}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thStyle}>Şirkət</th>
                    <th style={thStyle}>View</th>
                    <th style={thStyle}>Create</th>
                    <th style={thStyle}>Delete</th>
                    <th style={thStyle}>Archive</th>
                    <th style={thStyle}>Edit</th>
                  </tr>
                </thead>

                <tbody>
                  {companies.map((c, i) => (
                    <tr key={c.id} style={tbodyRow}>
                      <td style={tdStyle}>{c.name}</td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={!!permissions[i]?.can_view}
                          disabled={!selectedCompanies.includes(c.id)}
                          onChange={(e) =>
                            updatePermission(i, "can_view", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={permissions[i].can_create}
                          disabled={!selectedCompanies.includes(c.id)}
                          onChange={(e) =>
                            updatePermission(i, "can_create", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={permissions[i].can_delete}
                          disabled={!selectedCompanies.includes(c.id)}
                          onChange={(e) =>
                            updatePermission(i, "can_delete", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={permissions[i].can_archive}
                          disabled={!selectedCompanies.includes(c.id)}
                          onChange={(e) =>
                            updatePermission(i, "can_archive", e.target.checked)
                          }
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={permissions[i].can_edit}
                          disabled={!selectedCompanies.includes(c.id)}
                          onChange={(e) =>
                            updatePermission(i, "can_edit", e.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={modalActions}>
              <button onClick={updateUser} style={saveButton} type="button">
                Save
              </button>

              <button
                onClick={() => setEditingUser(null)}
                style={cancelButton}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

     <style jsx>{`
  .admin-users-page,
  .admin-users-page * {
    box-sizing: border-box;
  }

  .user-item,
  .users-check-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .user-item:hover,
  .users-check-card:hover {
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.35) !important;
    box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1) !important;
  }

  @media (max-width: 1100px) {
    .users-layout {
      display: block !important;
    }

    .users-layout > .users-card {
      margin-bottom: 16px !important;
    }

    .users-stats {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 900px) {
    .users-hero-content {
      display: block !important;
    }

    .users-hero-left,
    .users-hero-mini {
      width: 100% !important;
      min-width: 0 !important;
    }

    .users-hero-mini {
      margin-top: 16px !important;
    }

    .users-form-grid {
      grid-template-columns: 1fr !important;
    }

    .users-grid {
      grid-template-columns: 1fr !important;
    }

    .users-company-checks {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 560px) {
    .admin-users-page {
      padding: 14px 10px 24px !important;
    }

    .users-hero,
    .users-card,
    .users-list-card {
      padding: 14px 12px !important;
      border-radius: 18px !important;
    }

    .users-title {
      font-size: 27px !important;
      line-height: 1.15 !important;
    }

    .users-subtitle {
      font-size: 13px !important;
      line-height: 1.55 !important;
    }

    .users-hero-mini {
      padding: 14px !important;
      border-radius: 18px !important;
    }

    .user-item {
      display: block !important;
      padding: 14px !important;
      border-radius: 18px !important;
    }

    .user-actions {
      width: 100% !important;
      margin-top: 12px !important;
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
    }

    .user-actions button {
      width: 100% !important;
    }

    .users-modal {
      width: 94vw !important;
      max-height: 90vh !important;
      overflow-y: auto !important;
      padding: 16px 12px !important;
      border-radius: 18px !important;
    }
  }

  @media (max-width: 420px) {
    .users-title {
      font-size: 24px !important;
    }

    .users-hero,
    .users-card,
    .users-list-card {
      padding: 12px 10px !important;
    }

    .user-actions {
      grid-template-columns: 1fr !important;
    }
  }
`}</style>
    </div>
  );
}

/* STYLES */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100svh",
  overflowX: "hidden",
  padding: "26px clamp(14px, 3vw, 32px) 38px",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 28%), linear-gradient(135deg, #f3f7fb 0%, #eaf2fb 48%, #f8fafc 100%)",
  color: "#0f172a",
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
  alignItems: "center",
  justifyContent: "space-between",
  gap: 22,
  flexWrap: "wrap",
};

const heroLeft: CSSProperties = {
  minWidth: 260,
  flex: "1 1 520px",
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
  lineHeight: 1.08,
  letterSpacing: "-0.055em",
  fontWeight: 950,
};

const subtitleStyle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: 760,
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

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const statCard: CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(203,213,225,0.86)",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  borderRadius: 22,
  padding: 18,
};

const statTop: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
};

const statLabel: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 850,
};

const statValue: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 32,
  lineHeight: 1,
  fontWeight: 950,
  marginBottom: 8,
};

const statHint: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
};

const statIconBlue: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
};

const statIconGreen: CSSProperties = {
  ...statIconBlue,
  background: "#dcfce7",
};

const statIconPurple: CSSProperties = {
  ...statIconBlue,
  background: "#ede9fe",
};

const layoutGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr",
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
  flexWrap: "wrap",
  marginBottom: 18,
};

const cardTitle: CSSProperties = {
  margin: 0,
  fontSize: 21,
  fontWeight: 950,
  color: "#0f172a",
};

const cardText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const statusPill: CSSProperties = {
  padding: "15px 3px",
  borderRadius: 999,
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: 12,
  fontWeight: 950,
};

const greenPill: CSSProperties = {
  ...statusPill,
};

const formGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "13px 14px",
  borderRadius: 15,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
};

const companySelectBox: CSSProperties = {
  marginTop: 16,
};

const smallTitle: CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 950,
  marginBottom: 10,
};

const companyChecks: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: 10,
};

const checkCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: 12,
  borderRadius: 15,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  fontWeight: 850,
  cursor: "pointer",
};

const checkCardActive: CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
};

const permissionBox: CSSProperties = {
  marginTop: 18,
};

const tableWrap: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  borderRadius: 18,
  border: "1px solid #e2e8f0",
};

const permissionTable: CSSProperties = {
  width: "100%",
  minWidth: 700,
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "#fff",
};

const theadRow: CSSProperties = {
  background: "#f8fafc",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 12,
  color: "#475569",
  fontSize: 12,
  fontWeight: 950,
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tbodyRow: CSSProperties = {};

const tdStyle: CSSProperties = {
  padding: 12,
  color: "#0f172a",
  fontSize: 13,
  borderBottom: "1px solid #eef2f7",
  whiteSpace: "nowrap",
};

const primaryButton: CSSProperties = {
  width: "100%",
  marginTop: 18,
  border: "none",
  borderRadius: 16,
  padding: "14px 18px",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 950,
  cursor: "pointer",
};

const passwordBox: CSSProperties = {
  display: "grid",
  gap: 12,
};

const successButton: CSSProperties = {
  ...primaryButton,
  marginTop: 0,
  background: "linear-gradient(135deg, #16a34a, #15803d)",
};

const listCard: CSSProperties = {
  marginTop: 20,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(203,213,225,0.9)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.09)",
  borderRadius: 26,
  padding: 20,
};

const listHeader: CSSProperties = {
  marginBottom: 16,
};

const usersGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
  gap: 14,
};

const userItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: 16,
  borderRadius: 20,
  background: "#fff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
};

const userLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const userAvatar: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#e0f2fe",
  color: "#0369a1",
  fontWeight: 950,
  flexShrink: 0,
};

const userInfo: CSSProperties = {
  minWidth: 0,
};

const userName: CSSProperties = {
  color: "#0f172a",
  fontWeight: 950,
  fontSize: 15,
};

const userEmail: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  marginTop: 3,
  wordBreak: "break-all",
};

const roleBadge: CSSProperties = {
  display: "inline-flex",
  marginTop: 7,
  padding: "5px 9px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 950,
};

const userActions: CSSProperties = {
  display: "flex",
  gap: 8,
  flexShrink: 0,
};

const deleteButton: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "8px 11px",
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
};

const editButton: CSSProperties = {
  ...deleteButton,
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
};

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.72)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
  padding: 18,
  backdropFilter: "blur(10px)",
};

const modalCard: CSSProperties = {
  width: 560,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "rgba(255,255,255,0.96)",
  padding: 22,
  color: "#0f172a",
  borderRadius: 24,
  boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 16,
};

const modalEyebrow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 8,
};

const modalEyebrowDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#2563eb",
};

const modalTitle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 950,
};

const modalCloseButton: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 24,
};

const modalInput: CSSProperties = {
  width: "100%",
  marginBottom: 10,
  padding: 12,
  borderRadius: 15,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  outline: "none",
};

const modalSection: CSSProperties = {
  marginBottom: 12,
};

const modalActions: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 15,
};

const saveButton: CSSProperties = {
  flex: 1,
  border: "none",
  borderRadius: 15,
  padding: "12px 14px",
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 950,
  cursor: "pointer",
};

const cancelButton: CSSProperties = {
  flex: 1,
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  padding: "12px 14px",
  background: "#f1f5f9",
  color: "#334155",
  fontSize: 14,
  fontWeight: 950,
  cursor: "pointer",
};