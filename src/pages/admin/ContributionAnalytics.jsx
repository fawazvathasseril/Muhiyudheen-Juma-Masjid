import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function ContributionAnalytics() {
  const {
    member,
    loading: authLoading,
  } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [externalContributors, setExternalContributors] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // PERIOD FILTER
  // ========================================

  const [periodType, setPeriodType] =
    useState("month");

  const [selectedMonth, setSelectedMonth] =
    useState(
      new Date().toISOString().slice(0, 7)
    );

  const [selectedYear, setSelectedYear] =
    useState(
      String(new Date().getFullYear())
    );

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();

    const diff =
      day === 0
        ? -6
        : 1 - day;

    d.setDate(
      d.getDate() + diff
    );

    d.setHours(
      0,
      0,
      0,
      0
    );

    return d;
  }

  const [selectedWeek, setSelectedWeek] =
    useState(() => {
      const monday =
        getMonday(new Date());

      return monday
        .toISOString()
        .split("T")[0];
    });

  const [customStart, setCustomStart] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [customEnd, setCustomEnd] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );


  // ========================================
  // LOAD DATA
  // ========================================

  async function loadData() {
    setLoading(true);
    setError("");

    const [
      transactionsResult,
      membersResult,
      externalResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(`
          id,
          amount,
          type,
          category,
          transaction_date,
          mahall_member_id,
          external_contributor_id,
          funds (
            id,
            name
          )
        `)
        .eq("type", "income")
        .order("transaction_date", {
          ascending: false,
        }),

      supabase
        .from("mahall_members")
        .select(`
          id,
          member_code,
          full_name,
          address,
          household_name
        `),

      supabase
        .from("external_contributors")
        .select(`
          id,
          contributor_code,
          full_name,
          organization
        `),
    ]);

    if (transactionsResult.error) {
      setError(
        transactionsResult.error.message
      );
      setLoading(false);
      return;
    }

    if (membersResult.error) {
      setError(
        membersResult.error.message
      );
      setLoading(false);
      return;
    }

    if (externalResult.error) {
      setError(
        externalResult.error.message
      );
      setLoading(false);
      return;
    }

    setTransactions(
      transactionsResult.data || []
    );

    setMembers(
      membersResult.data || []
    );

    setExternalContributors(
      externalResult.data || []
    );

    setLoading(false);
  }


  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);


  // ========================================
  // PERIOD RANGE
  // ========================================

  const periodRange = useMemo(() => {
    let start;
    let end;

    if (periodType === "year") {
      const year =
        Number(selectedYear);

      start = new Date(
        year,
        0,
        1
      );

      end = new Date(
        year + 1,
        0,
        1
      );
    }

    else if (periodType === "week") {
      start = new Date(
        `${selectedWeek}T00:00:00`
      );

      end = new Date(start);

      end.setDate(
        end.getDate() + 7
      );
    }

    else if (periodType === "custom") {
      start = new Date(
        `${customStart}T00:00:00`
      );

      end = new Date(
        `${customEnd}T00:00:00`
      );

      end.setDate(
        end.getDate() + 1
      );
    }

    else {
      const [
        year,
        month,
      ] =
        selectedMonth
          .split("-")
          .map(Number);

      start = new Date(
        year,
        month - 1,
        1
      );

      end = new Date(
        year,
        month,
        1
      );
    }

    return {
      start,
      end,
    };
  }, [
    periodType,
    selectedMonth,
    selectedYear,
    selectedWeek,
    customStart,
    customEnd,
  ]);


  // ========================================
  // FILTER TRANSACTIONS
  // ========================================

  const filteredTransactions =
    useMemo(() => {
      return transactions.filter(
        (transaction) => {
          const date = new Date(
            `${transaction.transaction_date}T00:00:00`
          );

          return (
            date >= periodRange.start &&
            date < periodRange.end
          );
        }
      );
    }, [
      transactions,
      periodRange,
    ]);


  // ========================================
  // TOTAL CONTRIBUTIONS
  // ========================================

  const totalContributions =
    useMemo(() => {
      return transactions.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount),
        0
      );
    }, [transactions]);


  const periodContributions =
    useMemo(() => {
      return filteredTransactions.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount),
        0
      );
    }, [
      filteredTransactions,
    ]);


  const mahallContributions =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            transaction.mahall_member_id
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(transaction.amount),
          0
        );
    }, [
      filteredTransactions,
    ]);


  const externalContributions =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            transaction.external_contributor_id
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(transaction.amount),
          0
        );
    }, [
      filteredTransactions,
    ]);


  // ========================================
  // CATEGORY BREAKDOWN
  // ========================================

  const categoryBreakdown =
    useMemo(() => {
      const grouped = {};

      filteredTransactions.forEach(
        (transaction) => {
          const category =
            transaction.category ||
            "other";

          grouped[category] =
            (grouped[category] || 0) +
            Number(transaction.amount);
        }
      );

      return Object.entries(grouped)
        .sort(
          (a, b) =>
            b[1] - a[1]
        );
    }, [
      filteredTransactions,
    ]);


  // ========================================
  // FUND BREAKDOWN
  // ========================================

  const fundBreakdown =
    useMemo(() => {
      const grouped = {};

      filteredTransactions.forEach(
        (transaction) => {
          const fund =
            transaction.funds?.name ||
            "Unknown Fund";

          grouped[fund] =
            (grouped[fund] || 0) +
            Number(transaction.amount);
        }
      );

      return Object.entries(grouped)
        .sort(
          (a, b) =>
            b[1] - a[1]
        );
    }, [
      filteredTransactions,
    ]);


  // ========================================
  // TOP MAHALL MEMBERS
  // ========================================

  const topMahallMembers =
    useMemo(() => {
      const totals = {};

      filteredTransactions
        .filter(
          (transaction) =>
            transaction.mahall_member_id
        )
        .forEach(
          (transaction) => {
            const id =
              transaction.mahall_member_id;

            totals[id] =
              (totals[id] || 0) +
              Number(
                transaction.amount
              );
          }
        );

      return Object.entries(totals)
        .map(
          ([id, amount]) => {
            const mahallMember =
              members.find(
                (item) =>
                  item.id === id
              );

            return {
              id,
              amount,
              member:
                mahallMember,
            };
          }
        )
        .sort(
          (a, b) =>
            b.amount - a.amount
        )
        .slice(0, 10);
    }, [
      filteredTransactions,
      members,
    ]);


  // ========================================
  // TOP EXTERNAL CONTRIBUTORS
  // ========================================

  const topExternalContributors =
    useMemo(() => {
      const totals = {};

      filteredTransactions
        .filter(
          (transaction) =>
            transaction.external_contributor_id
        )
        .forEach(
          (transaction) => {
            const id =
              transaction.external_contributor_id;

            totals[id] =
              (totals[id] || 0) +
              Number(
                transaction.amount
              );
          }
        );

      return Object.entries(totals)
        .map(
          ([id, amount]) => {
            const contributor =
              externalContributors.find(
                (item) =>
                  item.id === id
              );

            return {
              id,
              amount,
              contributor,
            };
          }
        )
        .sort(
          (a, b) =>
            b.amount - a.amount
        )
        .slice(0, 10);
    }, [
      filteredTransactions,
      externalContributors,
    ]);


  // ========================================
  // FORMATTING
  // ========================================

  function formatCurrency(amount) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount || 0)
    );
  }


  function formatCategory(
    category
  ) {
    return category
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      );
  }


  function formatDisplayDate(
    dateString
  ) {
    return new Date(
      `${dateString}T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }


  function getPeriodDescription() {
    if (
      periodType ===
      "year"
    ) {
      return `Showing contributions for ${selectedYear}`;
    }

    if (
      periodType ===
      "week"
    ) {
      const start =
        new Date(
          `${selectedWeek}T00:00:00`
        );

      const end =
        new Date(start);

      end.setDate(
        end.getDate() + 6
      );

      const startText =
        start.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );

      const endText =
        end.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );

      return `Showing contributions from ${startText} to ${endText}`;
    }

    if (
      periodType ===
      "custom"
    ) {
      const startText =
        formatDisplayDate(
          customStart
        );

      const endText =
        formatDisplayDate(
          customEnd
        );

      return `Showing contributions from ${startText} to ${endText}`;
    }

    const [year, month] =
      selectedMonth
        .split("-")
        .map(Number);

    const date =
      new Date(
        year,
        month - 1,
        1
      );

    return `Showing contributions for ${date.toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    )}`;
  }


  // ========================================
  // ACCESS CONTROL
  // ========================================

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="admin-loading">
        Loading contribution analytics...
      </div>
    );
  }


  if (
    member?.role !== "admin" &&
    member?.role !== "treasurer"
  ) {
    return (
      <div className="admin-access-denied">

        <div>

          <h1>
            Access denied
          </h1>

          <p>
            Only administrators and
            treasurers can view contribution
            analytics.
          </p>

        </div>

      </div>
    );
  }


  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="contribution-analytics-page">

      {/* HEADER */}

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            MAHALL ANALYTICS
          </p>

          <h1>
            Contribution Analytics
          </h1>

          <p>
            Analyze contributions across members,
            contributors, categories and funds.
          </p>

        </div>

        <button
          className="secondary-button"
          onClick={loadData}
        >
          ↻ Refresh
        </button>

      </div>


      {/* PERIOD FILTER */}

      <div className="analytics-period-bar">

        <div>

          <label>
            Analyze By
          </label>

          <select
            value={periodType}
            onChange={(event) =>
              setPeriodType(
                event.target.value
              )
            }
          >

            <option value="week">
              Week
            </option>

            <option value="month">
              Month
            </option>

            <option value="year">
              Year
            </option>

            <option value="custom">
              Custom Range
            </option>

          </select>

        </div>


        {periodType ===
          "month" && (

          <div>

            <label>
              Month
            </label>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
            />

          </div>

        )}


        {periodType ===
          "year" && (

          <div>

            <label>
              Year
            </label>

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  event.target.value
                )
              }
            >

              {Array.from(
                {
                  length: 7,
                },
                (_, index) => {
                  const year =
                    new Date().getFullYear() -
                    index;

                  return (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  );
                }
              )}

            </select>

          </div>

        )}


        {periodType ===
          "week" && (

          <div>

            <label>
              Week Starting
            </label>

            <input
              type="date"
              value={selectedWeek}
              onChange={(event) =>
                setSelectedWeek(
                  event.target.value
                )
              }
            />

          </div>

        )}


        {periodType ===
          "custom" && (
          <>
            <div>

              <label>
                From
              </label>

              <input
                type="date"
                value={customStart}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setCustomStart(
                    value
                  );

                  if (
                    customEnd <
                    value
                  ) {
                    setCustomEnd(
                      value
                    );
                  }
                }}
              />

            </div>

            <div>

              <label>
                To
              </label>

              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(event) =>
                  setCustomEnd(
                    event.target.value
                  )
                }
              />

            </div>
          </>
        )}

      </div>


      <p className="analytics-period-description">
        {getPeriodDescription()}
      </p>


      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}


      {/* SUMMARY */}

      <div className="contribution-summary-grid">

        <div className="contribution-summary-card">

          <span>
            ALL-TIME CONTRIBUTIONS
          </span>

          <strong>
            {formatCurrency(
              totalContributions
            )}
          </strong>

        </div>


        <div className="contribution-summary-card">

          <span>
            SELECTED PERIOD
          </span>

          <strong>
            {formatCurrency(
              periodContributions
            )}
          </strong>

        </div>


        <div className="contribution-summary-card">

          <span>
            MAHALL MEMBERS
          </span>

          <strong>
            {formatCurrency(
              mahallContributions
            )}
          </strong>

        </div>


        <div className="contribution-summary-card">

          <span>
            EXTERNAL CONTRIBUTORS
          </span>

          <strong>
            {formatCurrency(
              externalContributions
            )}
          </strong>

        </div>

      </div>


      {/* CATEGORY + FUND */}

      <div className="contribution-analytics-grid">

        {/* CATEGORY */}

        <section className="analytics-panel">

          <div className="analytics-panel-heading">

            <h2>
              By Category
            </h2>

            <p>
              Contributions during the selected period
            </p>

          </div>


          {categoryBreakdown.length ===
            0 ? (

            <p className="analytics-empty">
              No contributions during this period.
            </p>

          ) : (

            <div className="analytics-bar-list">

              {categoryBreakdown.map(
                ([category, amount]) => {

                  const percentage =
                    periodContributions >
                    0
                      ? (
                          amount /
                          periodContributions
                        ) * 100
                      : 0;

                  return (
                    <div
                      className="analytics-bar-item"
                      key={category}
                    >

                      <div className="analytics-bar-label">

                        <span>
                          {formatCategory(
                            category
                          )}
                        </span>

                        <strong>
                          {formatCurrency(
                            amount
                          )}
                        </strong>

                      </div>

                      <div className="analytics-bar-track">

                        <div
                          className="analytics-bar-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>


        {/* FUND */}

        <section className="analytics-panel">

          <div className="analytics-panel-heading">

            <h2>
              By Fund
            </h2>

            <p>
              Contributions during the selected period
            </p>

          </div>


          {fundBreakdown.length ===
            0 ? (

            <p className="analytics-empty">
              No contributions during this period.
            </p>

          ) : (

            <div className="analytics-bar-list">

              {fundBreakdown.map(
                ([fund, amount]) => {

                  const percentage =
                    periodContributions >
                    0
                      ? (
                          amount /
                          periodContributions
                        ) * 100
                      : 0;

                  return (
                    <div
                      className="analytics-bar-item"
                      key={fund}
                    >

                      <div className="analytics-bar-label">

                        <span>
                          {fund}
                        </span>

                        <strong>
                          {formatCurrency(
                            amount
                          )}
                        </strong>

                      </div>

                      <div className="analytics-bar-track">

                        <div
                          className="analytics-bar-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </div>


      {/* TOP CONTRIBUTORS */}

      <div className="contribution-analytics-grid">

        {/* MAHALL MEMBERS */}

        <section className="analytics-panel">

          <div className="analytics-panel-heading">

            <h2>
              Top Mahall Contributors
            </h2>

            <p>
              Highest contributions in the selected period
            </p>

          </div>


          {topMahallMembers.length ===
            0 ? (

            <p className="analytics-empty">
              No linked Mahall contributions during this period.
            </p>

          ) : (

            <div className="top-contributor-list">

              {topMahallMembers.map(
                (item, index) => (

                  <div
                    className="top-contributor-row"
                    key={item.id}
                  >

                    <span className="rank">
                      {index + 1}
                    </span>


                    <div className="top-contributor-info">

                      <strong>
                        {item.member?.full_name ||
                          "Unknown Member"}
                      </strong>

                      <small>
                        {item.member?.member_code ||
                          "Unknown ID"}

                        {item.member?.address
                          ? ` — ${item.member.address}`
                          : ""}
                      </small>

                    </div>


                    <strong>
                      {formatCurrency(
                        item.amount
                      )}
                    </strong>

                  </div>

                )
              )}

            </div>

          )}

        </section>


        {/* EXTERNAL CONTRIBUTORS */}

        <section className="analytics-panel">

          <div className="analytics-panel-heading">

            <h2>
              Top External Contributors
            </h2>

            <p>
              Highest contributions in the selected period
            </p>

          </div>


          {topExternalContributors.length ===
            0 ? (

            <p className="analytics-empty">
              No linked external contributions during this period.
            </p>

          ) : (

            <div className="top-contributor-list">

              {topExternalContributors.map(
                (item, index) => (

                  <div
                    className="top-contributor-row"
                    key={item.id}
                  >

                    <span className="rank">
                      {index + 1}
                    </span>


                    <div className="top-contributor-info">

                      <strong>
                        {item.contributor?.full_name ||
                          item.contributor?.organization ||
                          "Unknown Contributor"}
                      </strong>

                      <small>
                        {item.contributor?.contributor_code ||
                          "Unknown ID"}

                        {item.contributor?.organization
                          ? ` — ${item.contributor.organization}`
                          : ""}
                      </small>

                    </div>


                    <strong>
                      {formatCurrency(
                        item.amount
                      )}
                    </strong>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </div>

    </div>
  );
}

export default ContributionAnalytics;