import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function ExternalContributorProfile() {
  const { id } = useParams();

  const [contributor, setContributor] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadContributor() {
    setLoading(true);
    setError("");

    const [contributorResult, transactionsResult] =
      await Promise.all([
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
          .eq("id", id)
          .single(),

        supabase
          .from("transactions")
          .select(`
            id,
            amount,
            type,
            category,
            description,
            transaction_date,
            reference_number,
            payment_method,
            funds (
              id,
              name
            )
          `)
          .eq("external_contributor_id", id)
          .eq("type", "income")
          .order("transaction_date", {
            ascending: false,
          }),
      ]);

    if (contributorResult.error) {
      setError(contributorResult.error.message);
      setLoading(false);
      return;
    }

    if (transactionsResult.error) {
      setError(
        transactionsResult.error.message
      );
      setLoading(false);
      return;
    }

    setContributor(contributorResult.data);
    setTransactions(
      transactionsResult.data || []
    );

    setLoading(false);
  }

  useEffect(() => {
    loadContributor();
  }, [id]);

  const totalContributions = useMemo(() => {
    return transactions.reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const grouped = {};

    transactions.forEach((transaction) => {
      const category =
        transaction.category || "other";

      grouped[category] =
        (grouped[category] || 0) +
        Number(transaction.amount);
    });

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const fundBreakdown = useMemo(() => {
    const grouped = {};

    transactions.forEach((transaction) => {
      const fundName =
        transaction.funds?.name ||
        "Unknown Fund";

      grouped[fundName] =
        (grouped[fundName] || 0) +
        Number(transaction.amount);
    });

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatCategory(category) {
    return category
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (char) => char.toUpperCase()
      );
  }

  function formatPaymentMethod(method) {
    if (!method) {
      return "—";
    }

    return method
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (char) => char.toUpperCase()
      );
  }

  if (loading) {
    return (
      <div className="admin-loading">
        Loading contributor profile...
      </div>
    );
  }

  if (error || !contributor) {
    return (
      <div className="admin-form-page">

        <div className="form-message error">
          {error || "Contributor not found."}
        </div>

        <Link
          to="/admin/external-contributors"
          className="secondary-button"
        >
          ← Back to Contributors
        </Link>

      </div>
    );
  }

  return (
    <div className="member-profile-page">

      <div className="admin-page-heading">

        <div>
          <p className="section-label">
            EXTERNAL CONTRIBUTOR
          </p>

          <h1>
            {contributor.full_name ||
              contributor.organization ||
              "Unnamed Contributor"}
          </h1>

          <p>
            {contributor.contributor_code}
          </p>
        </div>

        <Link
          to="/admin/external-contributors"
          className="secondary-button"
        >
          ← Back to Contributors
        </Link>

      </div>


      {/* Profile */}

      <section className="member-profile-card">

        <div className="member-profile-main">

          <div className="member-profile-avatar">
            {(contributor.full_name ||
              contributor.organization ||
              "E")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>

            <span className="member-code">
              {contributor.contributor_code}
            </span>

            <h2>
              {contributor.full_name ||
                contributor.organization ||
                "Unnamed Contributor"}
            </h2>

            {contributor.organization && (
              <p className="external-profile-org">
                {contributor.organization}
              </p>
            )}

          </div>

        </div>


        <div className="member-profile-details">

          <div>
            <span>
              Name
            </span>

            <strong>
              {contributor.full_name ||
                "Not provided"}
            </strong>
          </div>

          <div>
            <span>
              Organization
            </span>

            <strong>
              {contributor.organization ||
                "Not provided"}
            </strong>
          </div>

          <div>
            <span>
              Phone
            </span>

            <strong>
              {contributor.phone ||
                "Not provided"}
            </strong>
          </div>

          <div>
            <span>
              Email
            </span>

            <strong>
              {contributor.email ||
                "Not provided"}
            </strong>
          </div>

        </div>

        {contributor.notes && (
          <div className="external-profile-notes">
            <span>Notes</span>
            <p>{contributor.notes}</p>
          </div>
        )}

      </section>


      {/* Total */}

      <section className="member-total-card">

        <span>
          TOTAL CONTRIBUTIONS
        </span>

        <strong>
          {formatCurrency(
            totalContributions
          )}
        </strong>

        <small>
          {transactions.length} recorded contribution
          {transactions.length === 1
            ? ""
            : "s"}
        </small>

      </section>


      {/* Analytics */}

      <div className="member-analytics-grid">

        <section className="member-analytics-card">

          <div className="member-analytics-heading">
            <h2>
              Contributions by Category
            </h2>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p className="analytics-empty">
              No contributions recorded yet.
            </p>
          ) : (
            <div className="analytics-list">

              {categoryBreakdown.map(
                ([category, amount]) => (
                  <div
                    className="analytics-row"
                    key={category}
                  >
                    <span>
                      {formatCategory(category)}
                    </span>

                    <strong>
                      {formatCurrency(amount)}
                    </strong>
                  </div>
                )
              )}

            </div>
          )}

        </section>


        <section className="member-analytics-card">

          <div className="member-analytics-heading">
            <h2>
              Contributions by Fund
            </h2>
          </div>

          {fundBreakdown.length === 0 ? (
            <p className="analytics-empty">
              No contributions recorded yet.
            </p>
          ) : (
            <div className="analytics-list">

              {fundBreakdown.map(
                ([fund, amount]) => (
                  <div
                    className="analytics-row"
                    key={fund}
                  >
                    <span>
                      {fund}
                    </span>

                    <strong>
                      {formatCurrency(amount)}
                    </strong>
                  </div>
                )
              )}

            </div>
          )}

        </section>

      </div>


      {/* History */}

      <section className="member-history-section">

        <div className="report-section-heading">

          <div>
            <h2>
              Contribution History
            </h2>

            <p>
              Every contribution linked to this contributor.
            </p>
          </div>

        </div>

        {transactions.length === 0 ? (

          <div className="admin-empty-card">
            <h3>
              No contributions yet
            </h3>

            <p>
              Contributions linked to this contributor
              will appear here.
            </p>
          </div>

        ) : (

          <div className="transactions-table-card">

            <div className="transactions-table-wrapper">

              <table className="transactions-table">

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fund</th>
                    <th>Category</th>
                    <th>Payment</th>
                    <th>Reference</th>
                    <th className="amount-column">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {transactions.map(
                    (transaction) => (
                      <tr
                        key={transaction.id}
                      >

                        <td>
                          {formatDate(
                            transaction.transaction_date
                          )}
                        </td>

                        <td>
                          {transaction.funds?.name ||
                            "Unknown Fund"}
                        </td>

                        <td>
                          {formatCategory(
                            transaction.category
                          )}
                        </td>

                        <td>
                          {formatPaymentMethod(
                            transaction.payment_method
                          )}
                        </td>

                        <td>
                          {transaction.reference_number ||
                            "—"}
                        </td>

                        <td className="amount-income">
                          +{" "}
                          {formatCurrency(
                            transaction.amount
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

      </section>

    </div>
  );
}

export default ExternalContributorProfile;