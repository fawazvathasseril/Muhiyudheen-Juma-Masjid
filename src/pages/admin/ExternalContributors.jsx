import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function ExternalContributors() {
  const {
    member: currentMember,
    loading: authLoading,
  } = useAuth();

  const [contributors, setContributors] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    organization: "",
    notes: "",
  });

  async function loadContributors() {
    setLoading(true);
    setError("");

    const [
      contributorsResult,
      transactionsResult,
    ] = await Promise.all([
      supabase
        .from("external_contributors")
        .select(`
          id,
          contributor_code,
          full_name,
          phone,
          email,
          organization,
          notes,
          created_at
        `)
        .order("contributor_code"),

      supabase
        .from("transactions")
        .select(`
          id,
          amount,
          type,
          external_contributor_id
        `)
        .not(
          "external_contributor_id",
          "is",
          null
        ),
    ]);

    if (contributorsResult.error) {
      setError(
        contributorsResult.error.message
      );
      setContributors([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    if (transactionsResult.error) {
      setError(
        transactionsResult.error.message
      );
      setContributors(
        contributorsResult.data || []
      );
      setTransactions([]);
      setLoading(false);
      return;
    }

    setContributors(
      contributorsResult.data || []
    );

    setTransactions(
      transactionsResult.data || []
    );

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) {
      loadContributors();
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

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.fullName.trim()) {
      setError(
        "Please enter the contributor name."
      );
      return;
    }

    setSaving(true);

    const { data, error } =
      await supabase.rpc(
        "create_external_contributor",
        {
          p_full_name:
            form.fullName.trim(),

          p_phone:
            form.phone.trim() || null,

          p_email:
            form.email.trim() || null,

          p_organization:
            form.organization.trim() ||
            null,

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
      `${data.contributor_code} created successfully.`
    );

    setForm({
      fullName: "",
      phone: "",
      email: "",
      organization: "",
      notes: "",
    });

    loadContributors();
  }

  const contributorData = useMemo(() => {
    return contributors.map(
      (contributor) => {
        const relatedTransactions =
          transactions.filter(
            (transaction) =>
              transaction.external_contributor_id ===
              contributor.id
          );

        const total =
          relatedTransactions
            .filter(
              (transaction) =>
                transaction.type ===
                "income"
            )
            .reduce(
              (sum, transaction) =>
                sum +
                Number(transaction.amount),
              0
            );

        return {
          ...contributor,
          total,
        };
      }
    );
  }, [contributors, transactions]);

  const filteredContributors =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return contributorData;
      }

      return contributorData.filter(
        (contributor) =>
          contributor.contributor_code
            .toLowerCase()
            .includes(query) ||
          (contributor.full_name || "")
            .toLowerCase()
            .includes(query) ||
          (contributor.organization || "")
            .toLowerCase()
            .includes(query) ||
          (contributor.phone || "")
            .toLowerCase()
            .includes(query)
      );
    }, [
      contributorData,
      search,
    ]);

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  if (authLoading || loading) {
    return (
      <div className="admin-loading">
        Loading external contributors...
      </div>
    );
  }

  if (
    currentMember?.role !==
      "admin" &&
    currentMember?.role !==
      "treasurer"
  ) {
    return (
      <div className="admin-access-denied">
        <div>
          <h1>Access denied</h1>

          <p>
            Only administrators and
            treasurers can manage external
            contributors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="external-contributors-page">

      <div className="admin-page-heading">

        <div>
          <p className="section-label">
            CONTRIBUTOR MANAGEMENT
          </p>

          <h1>
            External Contributors
          </h1>

          <p>
            Manage contributors who are not registered
            members of the Mahall.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadContributors}
        >
          ↻ Refresh
        </button>

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

      <div className="external-contributor-layout">

        <section className="admin-form-card">

          <div className="admin-section-heading">
            <div>
              <h2>
                Add Contributor
              </h2>

              <p>
                A unique EXT ID will be generated automatically.
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
                placeholder="Contributor name"
                required
              />
            </div>

            <div className="form-field">
              <label>
                Organization
              </label>

              <input
                type="text"
                name="organization"
                value={form.organization}
                onChange={handleChange}
                placeholder="Optional"
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
                placeholder="Optional"
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
                rows="4"
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
                  : "Create Contributor"}
              </button>

            </div>

          </form>

        </section>


        <section className="external-contributor-directory">

          <div className="member-directory-header">

            <div>
              <h2>
                Contributor Directory
              </h2>

              <p>
                Search by ID, name, organization or phone.
              </p>
            </div>

            <input
              type="search"
              className="member-search"
              placeholder="Search..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

          </div>


          <div className="external-contributor-list">

            {filteredContributors.length === 0 ? (

              <div className="admin-empty-card">

                <h3>
                  No contributors found
                </h3>

                <p>
                  Add an external contributor or change your search.
                </p>

              </div>

            ) : (

              filteredContributors.map(
                (contributor) => (

                  <Link
  to={`/admin/external-contributors/${contributor.id}`}
  className="external-contributor-card external-contributor-link"
  key={contributor.id}
>

  <div>

    <span className="member-code">
      {contributor.contributor_code}
    </span>

    <h3>
      {contributor.full_name ||
        "Unnamed contributor"}
    </h3>

    {contributor.organization && (
      <p>
        {contributor.organization}
      </p>
    )}

    {contributor.phone && (
      <p>
        ☎ {contributor.phone}
      </p>
    )}

  </div>

  <div className="external-contributor-total">

    <span>
      CONTRIBUTIONS
    </span>

    <strong>
      {formatCurrency(
        contributor.total
      )}
    </strong>

  </div>

</Link>

                )
              )

            )}

          </div>

        </section>

      </div>

    </div>
  );
}

export default ExternalContributors;