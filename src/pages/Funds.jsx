import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Funds() {
  const [funds, setFunds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFunds() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc(
      "get_public_fund_summary"
    );

    if (error) {
      setError(error.message);
      setFunds([]);
    } else {
      setFunds(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadFunds();
  }, []);

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  const totalIncome = funds.reduce(
    (total, fund) =>
      total + Number(fund.total_income || 0),
    0
  );

  const totalExpenses = funds.reduce(
    (total, fund) =>
      total + Number(fund.total_expenses || 0),
    0
  );

  const totalBalance =
    totalIncome - totalExpenses;

  return (
    <div className="funds-page">

      {/* Header */}

      <section className="page-hero">

        <div className="container">

          <p className="section-label">
            TRANSPARENCY
          </p>

          <h1>
            Funds & Transparency
          </h1>

          <p>
            An overview of how our community funds
            are maintained and utilized.
          </p>

        </div>

      </section>


      {/* Summary */}

      <section className="fund-summary-section">

        <div className="container">

          {loading ? (

            <div className="public-loading">
              Loading financial summary...
            </div>

          ) : error ? (

            <div className="public-error">
              Unable to load the financial summary right now.
            </div>

          ) : (

            <div className="fund-summary">

              <div>
                <span>
                  TOTAL FUNDS
                </span>

                <strong>
                  {formatCurrency(totalBalance)}
                </strong>
              </div>

              <div>
                <span>
                  TOTAL INCOME
                </span>

                <strong>
                  {formatCurrency(totalIncome)}
                </strong>
              </div>

              <div>
                <span>
                  TOTAL EXPENSES
                </span>

                <strong>
                  {formatCurrency(totalExpenses)}
                </strong>
              </div>

              <div>
                <span>
                  ACTIVE FUNDS
                </span>

                <strong>
                  {funds.length}
                </strong>
              </div>

            </div>

          )}

        </div>

      </section>


      {/* Fund breakdown */}

      <section className="funds-list-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <p className="section-label">
                FUND BREAKDOWN
              </p>

              <h2>
                Current Balances
              </h2>

            </div>

          </div>


          {loading ? (

            <div className="public-loading">
              Loading funds...
            </div>

          ) : error ? (

            <div className="public-error">
              Unable to load funds right now.
            </div>

          ) : funds.length === 0 ? (

            <div className="public-empty">

              <h3>
                No public fund information
              </h3>

              <p>
                Financial information will appear here
                once funds are configured.
              </p>

            </div>

          ) : (

            <div className="public-fund-grid">

              {funds.map((fund) => (

                <div
                  className="public-fund-card"
                  key={fund.id}
                >

                  <span className="fund-status">
                    ACTIVE
                  </span>

                  <h3>
                    {fund.name}
                  </h3>

                  <strong>
                    {formatCurrency(fund.balance)}
                  </strong>

                  <p>
                    {fund.description ||
                      "Community fund"}
                  </p>


                  <div className="public-fund-breakdown">

                    <div>
                      <span>
                        Income
                      </span>

                      <strong>
                        {formatCurrency(
                          fund.total_income
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Expenses
                      </span>

                      <strong>
                        {formatCurrency(
                          fund.total_expenses
                        )}
                      </strong>
                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>


      {/* Transparency statement */}

      <section className="fund-transparency-statement">

        <div className="container">

          <div className="statement-box">

            <span>
              ✓
            </span>

            <div>

              <h2>
                Our commitment to transparency
              </h2>

              <p>
                The Mahal Committee is committed to
                maintaining accurate financial records
                and providing the community with regular
                updates on the status and utilization
                of its funds.
              </p>

              <p>
                Public figures shown here are aggregated
                from the committee's financial records.
                Detailed transaction records remain
                restricted to authorized committee members.
              </p>

            </div>

          </div>

        </div>

      </section>


      <section className="funds-bottom">

        <Link
          to="/donate"
          className="primary-button"
        >
          Support Our Mahal
        </Link>

      </section>

    </div>
  );
}

export default Funds;