import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function Dashboard() {
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [funds, setFunds] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboardData() {
    setLoadingData(true);
    setError("");

    const [
      transactionsResult,
      fundsResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(`
          id,
          type,
          amount,
          category,
          description,
          transaction_date,
          funds (
            id,
            name
          )
        `)
        .order("transaction_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("funds")
        .select(`
          id,
          name,
          description
        `)
        .eq("is_active", true)
        .order("name"),
    ]);

    if (transactionsResult.error) {
      setError(
        transactionsResult.error.message
      );
      setLoadingData(false);
      return;
    }

    if (fundsResult.error) {
      setError(
        fundsResult.error.message
      );
      setLoadingData(false);
      return;
    }

    setTransactions(
      transactionsResult.data || []
    );

    setFunds(
      fundsResult.data || []
    );

    setLoadingData(false);
  }

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login", {
        replace: true,
      });

      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [authLoading, user, navigate]);


  const totalIncome = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "income"
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);


  const totalExpenses = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "expense"
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);


  const totalBalance =
    totalIncome - totalExpenses;


  const incomeThisMonth = useMemo(() => {
    const now = new Date();

    return transactions
      .filter((transaction) => {
        if (transaction.type !== "income") {
          return false;
        }

        const date = new Date(
          transaction.transaction_date
        );

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear()
        );
      })
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);


  const expensesThisMonth = useMemo(() => {
    const now = new Date();

    return transactions
      .filter((transaction) => {
        if (transaction.type !== "expense") {
          return false;
        }

        const date = new Date(
          transaction.transaction_date
        );

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear()
        );
      })
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);


  const donationsThisMonth = useMemo(() => {
    const now = new Date();

    return transactions.filter(
      (transaction) => {
        const date = new Date(
          transaction.transaction_date
        );

        return (
          transaction.type === "income" &&
          transaction.category === "donation" &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear()
        );
      }
    ).length;
  }, [transactions]);


  const fundBalances = useMemo(() => {
    return funds.map((fund) => {
      const balance = transactions
        .filter(
          (transaction) =>
            transaction.funds?.id === fund.id
        )
        .reduce((total, transaction) => {
          const amount =
            Number(transaction.amount);

          return transaction.type === "income"
            ? total + amount
            : total - amount;
        }, 0);

      return {
        ...fund,
        balance,
      };
    });
  }, [funds, transactions]);


  const recentTransactions =
    transactions.slice(0, 5);


  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }


  function formatDate(date) {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
      }
    );
  }


  if (authLoading || loadingData) {
    return (
      <div className="admin-loading">
        Loading dashboard...
      </div>
    );
  }


  if (!user) {
    return null;
  }


  return (
    <div className="dashboard-page">

      {/* Heading */}

      <div className="dashboard-heading">

        <div>

          <p className="section-label">
            OVERVIEW
          </p>

          <h1>
            Dashboard
          </h1>

          <p>
            Live financial overview of the Mahal.
          </p>

        </div>

        <button
          className="secondary-button dashboard-refresh"
          onClick={loadDashboardData}
        >
          ↻ Refresh
        </button>

      </div>


      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}


      {/* Stats */}

      <div className="dashboard-stats">

        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">
            <span>Total Balance</span>

            <span className="stat-icon green">
              ₹
            </span>
          </div>

          <strong>
            {formatCurrency(totalBalance)}
          </strong>

          <small>
            All funds combined
          </small>

        </div>


        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">
            <span>Income This Month</span>

            <span className="stat-icon blue">
              ↑
            </span>
          </div>

          <strong>
            {formatCurrency(
              incomeThisMonth
            )}
          </strong>

          <small>
            Recorded income
          </small>

        </div>


        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">
            <span>Expenses This Month</span>

            <span className="stat-icon red">
              ↓
            </span>
          </div>

          <strong>
            {formatCurrency(
              expensesThisMonth
            )}
          </strong>

          <small>
            Recorded expenses
          </small>

        </div>


        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">
            <span>Donations This Month</span>

            <span className="stat-icon purple">
              ♥
            </span>
          </div>

          <strong>
            {donationsThisMonth}
          </strong>

          <small>
            Recorded donations
          </small>

        </div>

      </div>


      {/* Main grid */}

      <div className="dashboard-main-grid">


        {/* Funds */}

        <section className="dashboard-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Fund Overview
              </h2>

              <p>
                Live balance by fund
              </p>

            </div>

            <Link to="/admin/funds">
              View all
            </Link>

          </div>


          <div className="fund-bars">

            {fundBalances.map((fund) => {

              const percentage =
                totalBalance > 0
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (fund.balance /
                          totalBalance) *
                          100
                      )
                    )
                  : 0;

              return (
                <div
                  className="fund-bar-row"
                  key={fund.id}
                >

                  <div className="fund-bar-label">

                    <span>
                      {fund.name}
                    </span>

                    <strong>
                      {formatCurrency(
                        fund.balance
                      )}
                    </strong>

                  </div>

                  <div className="fund-bar-track">

                    <div
                      className="fund-bar-fill"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                </div>
              );
            })}

          </div>

        </section>


        {/* Recent transactions */}

        <section className="dashboard-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Recent Transactions
              </h2>

              <p>
                Latest financial activity
              </p>

            </div>

            <Link to="/admin/reports">
              View all
            </Link>

          </div>


          <div className="transactions-list">

            {recentTransactions.length === 0 ? (

              <div className="table-empty">
                <p>
                  No transactions yet.
                </p>
              </div>

            ) : (

              recentTransactions.map(
                (transaction) => (

                  <div
                    className="transaction-row"
                    key={transaction.id}
                  >

                    <div
                      className={
                        transaction.type ===
                        "income"
                          ? "transaction-icon income"
                          : "transaction-icon expense"
                      }
                    >
                      {transaction.type ===
                      "income"
                        ? "+"
                        : "−"}
                    </div>


                    <div className="transaction-details">

                      <strong>
                        {transaction.description ||
                          transaction.category}
                      </strong>

                      <span>
                        {transaction.funds?.name ||
                          "Unknown Fund"}{" "}
                        ·{" "}
                        {formatDate(
                          transaction.transaction_date
                        )}
                      </span>

                    </div>


                    <strong
                      className={
                        transaction.type ===
                        "income"
                          ? "transaction-amount income-text"
                          : "transaction-amount expense-text"
                      }
                    >
                      {transaction.type ===
                      "income"
                        ? "+"
                        : "-"}{" "}
                      {formatCurrency(
                        Number(
                          transaction.amount
                        )
                      )}
                    </strong>

                  </div>

                )
              )

            )}

          </div>

        </section>

      </div>


      {/* Quick actions */}

      <section className="quick-actions-section">

        <div className="panel-heading">

          <div>
            <h2>
              Quick Actions
            </h2>

            <p>
              Frequently used committee tools
            </p>
          </div>

        </div>


        <div className="quick-actions-grid">

          <Link
            to="/admin/donations"
            className="quick-action-card"
          >
            <span className="quick-action-icon income-bg">
              +
            </span>

            <div>
              <strong>
                Add Donation
              </strong>

              <p>
                Record a new donation
              </p>
            </div>

            <span>→</span>

          </Link>


          <Link
            to="/admin/expenses"
            className="quick-action-card"
          >
            <span className="quick-action-icon expense-bg">
              −
            </span>

            <div>
              <strong>
                Add Expense
              </strong>

              <p>
                Record a new expense
              </p>
            </div>

            <span>→</span>

          </Link>


          <Link
            to="/admin/reports"
            className="quick-action-card"
          >
            <span className="quick-action-icon report-bg">
              ▥
            </span>

            <div>
              <strong>
                View Transactions
              </strong>

              <p>
                Full financial history
              </p>
            </div>

            <span>→</span>

          </Link>


          <Link
            to="/admin/announcements"
            className="quick-action-card"
          >
            <span className="quick-action-icon info-bg">
              !
            </span>

            <div>
              <strong>
                New Announcement
              </strong>

              <p>
                Publish a community notice
              </p>
            </div>

            <span>→</span>

          </Link>

        </div>

      </section>

    </div>
  );
}

export default Dashboard;