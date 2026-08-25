import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function MahallMembers() {
  const {
    member: currentMember,
    loading: authLoading,
  } = useAuth();

  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
const [showImport, setShowImport] =
  useState(false);

const [importFile, setImportFile] =
  useState(null);

const [importRows, setImportRows] =
  useState([]);

const [importing, setImporting] =
  useState(false);

const [importResult, setImportResult] =
  useState(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    householdName: "",
    notes: "",
  });


  async function loadMembers() {
    setLoading(true);
    setError("");

    const [membersResult, transactionsResult] =
      await Promise.all([
        supabase
          .from("mahall_members")
          .select(`
            id,
            member_code,
            full_name,
            phone,
            email,
            address,
            household_name,
            status,
            notes,
            created_at
          `)
          .order("member_code"),

        supabase
          .from("transactions")
          .select(`
            id,
            amount,
            type,
            mahall_member_id
          `)
          .not("mahall_member_id", "is", null)
      ]);

    if (membersResult.error) {
      setError(membersResult.error.message);
      setMembers([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    if (transactionsResult.error) {
      setError(
        transactionsResult.error.message
      );
      setMembers(membersResult.data || []);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setMembers(membersResult.data || []);
    setTransactions(
      transactionsResult.data || []
    );

    setLoading(false);
  }


  useEffect(() => {
    if (!authLoading) {
      loadMembers();
    }
  }, [authLoading]);


  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (
      char === "," &&
      !insideQuotes
    ) {
      result.push(
        current.trim()
      );

      current = "";

      continue;
    }

    current += char;
  }

  result.push(
    current.trim()
  );

  return result;
}


function parseCSV(text) {
  const lines =
    text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(
        (line) =>
          line.trim() !== ""
      );

  if (lines.length < 2) {
    throw new Error(
      "The CSV must contain a header row and at least one member."
    );
  }

  const headers =
    parseCSVLine(
      lines[0]
    ).map(
      (header) =>
        header
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
    );

  const requiredHeaders = [
    "full_name",
  ];

  const missingHeaders =
    requiredHeaders.filter(
      (header) =>
        !headers.includes(
          header
        )
    );

  if (
    missingHeaders.length
  ) {
    throw new Error(
      `Missing required column: ${missingHeaders.join(
        ", "
      )}`
    );
  }

  return lines
    .slice(1)
    .map(
      (line) => {

        const values =
          parseCSVLine(
            line
          );

        const row = {};

        headers.forEach(
          (
            header,
            index
          ) => {

            row[header] =
              values[index] ||
              "";
          }
        );

        return {
          fullName:
            row.full_name
              ?.trim() || "",

          phone:
            row.phone
              ?.trim() || "",

          email:
            row.email
              ?.trim() || "",

          address:
            row.address
              ?.trim() || "",

          householdName:
            (
              row.household_name ||
              row.household ||
              ""
            ).trim(),

          notes:
            row.notes
              ?.trim() || "",
        };
      }
    );
}


async function handleImportFile(
  event
) {

  const file =
    event.target.files?.[0];

  setError("");
  setMessage("");
  setImportResult(null);


  if (!file) {
    return;
  }


  if (
    !file.name
      .toLowerCase()
      .endsWith(".csv")
  ) {

    setError(
      "Please choose a CSV file."
    );

    event.target.value = "";

    return;
  }


  try {

    const text =
      await file.text();

    const rows =
      parseCSV(text);


    const validRows =
      rows.filter(
        (row) =>
          row.fullName
      );


    if (
      validRows.length === 0
    ) {

      throw new Error(
        "No valid member rows were found."
      );
    }


    setImportFile(
      file
    );

    setImportRows(
      validRows
    );

  } catch (
    importError
  ) {

    setImportFile(
      null
    );

    setImportRows([]);

    setError(
      importError.message ||
        "Unable to read the CSV file."
    );

    event.target.value = "";
  }
}


function downloadImportTemplate() {

  const csv = [
    "full_name,phone,email,address,household_name,notes",

    "\"Ahmed Ali\",\"+91 9876543210\",\"ahmed@example.com\",\"House 12, Main Road\",\"Ali Family\",\"Optional notes\"",

    "\"Fathima Rahman\",\"+91 9876543211\",\"fathima@example.com\",\"House 18, Market Road\",\"Rahman Family\",\"\"",
  ].join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    "mahall-members-template.csv";

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );
}


async function importMembers() {

  if (
    importRows.length === 0
  ) {

    setError(
      "There are no members to import."
    );

    return;
  }


  setImporting(true);
  setError("");
  setMessage("");
  setImportResult(null);


  let imported = 0;

  let skipped = 0;

  const failedRows = [];


  try {

    /*
     * Load existing members once so we
     * can detect obvious duplicates.
     */

    const {
      data:
        existingMembers,
      error:
        existingError,
    } =
      await supabase
        .from(
          "mahall_members"
        )
        .select(`
          full_name,
          phone,
          email
        `);


    if (
      existingError
    ) {
      throw existingError;
    }


    const existingEmails =
      new Set(
        (existingMembers || [])
          .map(
            (member) =>
              member.email
                ?.trim()
                .toLowerCase()
          )
          .filter(Boolean)
      );


    const existingPhones =
      new Set(
        (existingMembers || [])
          .map(
            (member) =>
              member.phone
                ?.replace(
                  /\D/g,
                  ""
                )
          )
          .filter(Boolean)
      );


    for (
      let index = 0;
      index <
      importRows.length;
      index++
    ) {

      const row =
        importRows[index];

      const rowNumber =
        index + 2;


      if (
        !row.fullName
          .trim()
      ) {

        skipped++;

        failedRows.push(
          {
            row:
              rowNumber,

            reason:
              "Full name is missing.",
          }
        );

        continue;
      }


      const email =
        row.email
          .trim()
          .toLowerCase();


      const phone =
        row.phone
          .replace(
            /\D/g,
            ""
          );


      if (
        email &&
        existingEmails.has(
          email
        )
      ) {

        skipped++;

        failedRows.push(
          {
            row:
              rowNumber,

            name:
              row.fullName,

            reason:
              "A member with this email already exists.",
          }
        );

        continue;
      }


      if (
        phone &&
        existingPhones.has(
          phone
        )
      ) {

        skipped++;

        failedRows.push(
          {
            row:
              rowNumber,

            name:
              row.fullName,

            reason:
              "A member with this phone number already exists.",
          }
        );

        continue;
      }


      const {
        data,
        error:
          createError,
      } =
        await supabase.rpc(
          "create_mahall_member",
          {
            p_full_name:
              row.fullName.trim(),

            p_phone:
              row.phone.trim() ||
              null,

            p_email:
              row.email.trim() ||
              null,

            p_address:
              row.address.trim() ||
              null,

            p_household_name:
              row.householdName.trim() ||
              null,

            p_notes:
              row.notes.trim() ||
              null,
          }
        );


      if (
        createError
      ) {

        skipped++;

        failedRows.push(
          {
            row:
              rowNumber,

            name:
              row.fullName,

            reason:
              createError.message,
          }
        );

        continue;
      }


      imported++;


      /*
       * Add the successfully imported
       * values to our duplicate sets so
       * duplicates within the same CSV
       * are also caught.
       */

      if (email) {
        existingEmails.add(
          email
        );
      }

      if (phone) {
        existingPhones.add(
          phone
        );
      }

    }


    setImportResult({
      imported,

      skipped,

      failedRows,
    });


    setImportRows([]);


    setImportFile(
      null
    );


    const fileInput =
      document.getElementById(
        "mahall-import-file"
      );


    if (fileInput) {
      fileInput.value =
        "";
    }


    if (
      imported > 0
    ) {

      setMessage(
        `${imported} member${
          imported === 1
            ? ""
            : "s"
        } imported successfully.`
      );

      await loadMembers();

    }


  } catch (
    importError
  ) {

    setError(
      importError?.message ||
        "Unable to import members."
    );

  } finally {

    setImporting(
      false
    );
  }
}


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.fullName.trim()) {
      setError("Please enter the member's name.");
      return;
    }

    setSaving(true);

    const { data, error } =
      await supabase.rpc(
        "create_mahall_member",
        {
          p_full_name:
            form.fullName.trim(),

          p_phone:
            form.phone.trim() || null,

          p_email:
            form.email.trim() || null,

          p_address:
            form.address.trim() || null,

          p_household_name:
            form.householdName.trim() || null,

          p_notes:
            form.notes.trim() || null,
        }
      );

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      `${data.member_code} created successfully.`
    );

    setForm({
      fullName: "",
      phone: "",
      email: "",
      address: "",
      householdName: "",
      notes: "",
    });

    loadMembers();
  }


  async function toggleStatus(member) {
    setError("");
    setMessage("");

    const nextStatus =
      member.status === "active"
        ? "inactive"
        : "active";

    const { error } = await supabase
      .from("mahall_members")
      .update({
        status: nextStatus,
      })
      .eq("id", member.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item
      )
    );

    setMessage(
      `${member.member_code} is now ${nextStatus}.`
    );
  }


  const memberData = useMemo(() => {
    return members.map((member) => {

      const memberTransactions =
        transactions.filter(
          (transaction) =>
            transaction.mahall_member_id ===
            member.id
        );

      const contributions =
        memberTransactions
          .filter(
            (transaction) =>
              transaction.type === "income"
          )
          .reduce(
            (total, transaction) =>
              total +
              Number(transaction.amount),
            0
          );

      return {
        ...member,
        contributions,
      };
    });
  }, [members, transactions]);


  const filteredMembers = useMemo(() => {

    const query =
      search.trim().toLowerCase();

    if (!query) {
      return memberData;
    }

    return memberData.filter(
      (member) =>
        member.member_code
          .toLowerCase()
          .includes(query) ||
        member.full_name
          .toLowerCase()
          .includes(query) ||
        (member.household_name || "")
          .toLowerCase()
          .includes(query) ||
        (member.phone || "")
          .toLowerCase()
          .includes(query)
    );

  }, [memberData, search]);


  const totalMembers = members.length;

  const activeMembers =
    members.filter(
      (member) =>
        member.status === "active"
    ).length;

  const totalContributions =
    memberData.reduce(
      (total, member) =>
        total + member.contributions,
      0
    );


  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }


  if (authLoading || loading) {
    return (
      <div className="admin-loading">
        Loading Mahall members...
      </div>
    );
  }


  if (currentMember?.role !== "admin") {
    return (
      <div className="admin-access-denied">
        <div>
          <h1>
            Access denied
          </h1>

          <p>
            Only administrators can manage Mahall members.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="mahall-members-page">

      <div className="admin-page-heading">

        <div>
          <p className="section-label">
            MAHALL MANAGEMENT
          </p>

          <h1>
            Mahall Members
          </h1>

          <p>
            Manage registered members of the Mahall.
          </p>
        </div>

        <div className="mahall-header-actions">

  <button
    type="button"
    className="secondary-button"
    onClick={() =>
      setShowImport(true)
    }
  >
    ↑ Import Data
  </button>


  <button
    type="button"
    className="secondary-button"
    onClick={
      loadMembers
    }
  >
    ↻ Refresh
  </button>

</div>

      </div>


      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}

      {message && (
        <div className="form-message success">
          {message}
        </div>
      )}


      {/* Summary */}

      <div className="member-summary-grid">

        <div className="member-summary-card">
          <span>
            TOTAL MEMBERS
          </span>

          <strong>
            {totalMembers}
          </strong>
        </div>


        <div className="member-summary-card">
          <span>
            ACTIVE MEMBERS
          </span>

          <strong>
            {activeMembers}
          </strong>
        </div>


        <div className="member-summary-card">
          <span>
            MEMBER CONTRIBUTIONS
          </span>

          <strong>
            {formatCurrency(
              totalContributions
            )}
          </strong>
        </div>

      </div>


      <div className="mahall-members-layout">


        {/* Add member */}

        <section className="admin-form-card">

          <div className="admin-section-heading">

            <div>
              <h2>
                Add Mahall Member
              </h2>

              <p>
                A unique Mahall ID will be generated automatically.
              </p>
            </div>

          </div>


          <form onSubmit={handleSubmit}>

            <div className="form-field">
              <label>
                Full Name
              </label>

              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Member's full name"
                required
              />
            </div>


            <div className="form-field">
              <label>
                Phone
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>


            <div className="form-field">
              <label>
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="member@email.com"
              />
            </div>


            <div className="form-field">
              <label>
                Household / Family
              </label>

              <input
                type="text"
                name="householdName"
                value={form.householdName}
                onChange={handleChange}
                placeholder="Family / household name"
              />
            </div>


            <div className="form-field">
              <label>
                Address
              </label>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows="3"
                placeholder="Member's address"
              />
            </div>


            <div className="form-field">
              <label>
                Notes
              </label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Optional notes"
              />
            </div>


            <div className="admin-form-actions">

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Create Member"}
              </button>

            </div>

          </form>

        </section>


        {/* Member list */}

        {showImport && (

  <div className="mahall-import-overlay">

    <div className="mahall-import-modal">

      <button
        type="button"
        className="mahall-import-close"
        onClick={() => {

          if (!importing) {

            setShowImport(
              false
            );

            setImportFile(
              null
            );

            setImportRows([]);

            setImportResult(
              null
            );
          }

        }}
        disabled={
          importing
        }
      >
        ×
      </button>


      <p className="section-label">
        MAHALL MANAGEMENT
      </p>


      <h2>
        Import Members
      </h2>


      <p className="mahall-import-intro">
        Import multiple Mahall members from a
        CSV spreadsheet. Member IDs will be
        generated automatically.
      </p>


      <div className="mahall-import-template">

        <div>

          <strong>
            Need the correct format?
          </strong>

          <p>
            Download the template and fill in
            your members.
          </p>

        </div>


        <button
          type="button"
          className="secondary-button"
          onClick={
            downloadImportTemplate
          }
        >
          ↓ Template
        </button>

      </div>


      <div className="mahall-import-upload">

        <label
          htmlFor="mahall-import-file"
          className="mahall-import-upload-box"
        >

          <span className="mahall-import-upload-icon">
            ↑
          </span>


          <strong>
            Choose CSV File
          </strong>


          <small>
            Full Name is required
          </small>

        </label>


        <input
          id="mahall-import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={
            handleImportFile
          }
          hidden
        />

      </div>


      {importFile && (
        <div className="mahall-import-file">

          <strong>
            {importFile.name}
          </strong>

          <span>
            {importRows.length} rows ready
          </span>

        </div>
      )}


      {importRows.length > 0 && (

        <div className="mahall-import-preview">

          <div className="mahall-import-preview-header">

            <strong>
              Preview
            </strong>

            <span>
              Showing first{" "}
              {Math.min(
                importRows.length,
                5
              )}{" "}
              rows
            </span>

          </div>


          <div className="mahall-import-table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Name
                  </th>

                  <th>
                    Phone
                  </th>

                  <th>
                    Email
                  </th>

                  <th>
                    Household
                  </th>

                </tr>

              </thead>


              <tbody>

                {importRows
                  .slice(0, 5)
                  .map(
                    (
                      row,
                      index
                    ) => (

                      <tr
                        key={
                          index
                        }
                      >

                        <td>
                          {
                            row.fullName
                          }
                        </td>

                        <td>
                          {
                            row.phone ||
                            "—"
                          }
                        </td>

                        <td>
                          {
                            row.email ||
                            "—"
                          }
                        </td>

                        <td>
                          {
                            row.householdName ||
                            "—"
                          }
                        </td>

                      </tr>

                    )
                  )}

              </tbody>

            </table>

          </div>

        </div>
      )}


      {importResult && (

        <div className="mahall-import-result">

          <div className="import-result-number success">
            <strong>
              {
                importResult.imported
              }
            </strong>

            <span>
              Imported
            </span>
          </div>


          <div className="import-result-number skipped">
            <strong>
              {
                importResult.skipped
              }
            </strong>

            <span>
              Skipped
            </span>
          </div>

        </div>
      )}


      {importResult?.failedRows?.length > 0 && (

        <div className="mahall-import-errors">

          <strong>
            Skipped rows
          </strong>


          <div>

            {importResult.failedRows
              .slice(0, 8)
              .map(
                (
                  item,
                  index
                ) => (

                  <p
                    key={
                      index
                    }
                  >
                    Row{" "}
                    {
                      item.row
                    }
                    :{" "}
                    {
                      item.reason
                    }
                  </p>

                )
              )}

          </div>

        </div>
      )}


      <div className="mahall-import-actions">

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setShowImport(
              false
            )
          }
          disabled={
            importing
          }
        >
          Close
        </button>


        <button
          type="button"
          className="primary-button"
          onClick={
            importMembers
          }
          disabled={
            importing ||
            importRows.length === 0
          }
        >
          {
            importing
              ? "Importing..."
              : `Import ${
                  importRows.length
                } Members`
          }
        </button>

      </div>

    </div>

  </div>

)}

        <section className="members-directory">

          <div className="member-directory-header">

            <div>
              <h2>
                Member Directory
              </h2>

              <p>
                Search by Mahall ID, name, phone or household.
              </p>
            </div>

            <input
              type="search"
              className="member-search"
              placeholder="Search members..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

          </div>


          <div className="mahall-member-list">

            {filteredMembers.length === 0 ? (

              <div className="admin-empty-card">

                <h3>
                  No members found
                </h3>

                <p>
                  Try another search or add a new member.
                </p>

              </div>

            ) : (

              filteredMembers.map((member) => (

                <article
                  className="mahall-member-card"
                  key={member.id}
                >

<Link
  to={`/admin/mahall-members/${member.id}`}
  className="mahall-member-identity member-profile-link"
>
  <div className="mahall-member-avatar">
    {member.full_name
      .charAt(0)
      .toUpperCase()}
  </div>

  <div>

    <span className="member-code">
      {member.member_code}
    </span>

    <h3>
      {member.full_name}
    </h3>

    {member.household_name && (
      <p>
        Family: {member.household_name}
      </p>
    )}

    {member.address && (
      <p className="member-address">
        📍 {member.address}
      </p>
    )}

    {member.phone && (
      <p className="member-phone">
        ☎ {member.phone}
      </p>
    )}

  </div>

</Link>
                  <div className="mahall-member-contribution">

                    <span>
                      CONTRIBUTIONS
                    </span>

                    <strong>
                      {formatCurrency(
                        member.contributions
                      )}
                    </strong>

                  </div>


                  <div className="mahall-member-status">

                    <span
                      className={
                        member.status === "active"
                          ? "member-status active"
                          : "member-status inactive"
                      }
                    >
                      {member.status}
                    </span>

                    <button
                      className="member-action"
                      onClick={() =>
                        toggleStatus(member)
                      }
                    >
                      {member.status === "active"
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                  </div>

                </article>

              ))

            )}

          </div>

        </section>

      </div>

    </div>
  );
}

export default MahallMembers;