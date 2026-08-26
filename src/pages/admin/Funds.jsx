import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function Funds() {
  const { member, loading: authLoading } = useAuth();

  const isAdmin = member?.role === "admin";

  /* ========================================
     GENERAL
  ======================================== */

  const [activeTab, setActiveTab] = useState("funds");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ========================================
     FUNDS
  ======================================== */

  const [funds, setFunds] = useState([]);

  const [transactions, setTransactions] = useState([]);

  const [websiteCollections, setWebsiteCollections] = useState([]);

  const [fundTransfers, setFundTransfers] = useState([]);

  /* ========================================
     CATEGORIES
  ======================================== */

  const [categories, setCategories] = useState([]);

  /* ========================================
     FUND MODAL
  ======================================== */

  const [showFundModal, setShowFundModal] = useState(false);

  const [editingFund, setEditingFund] = useState(null);

  const [savingFund, setSavingFund] = useState(false);

  const [fundForm, setFundForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    fundType: "masjid",
    includeInMasjidTotals: true,
    startDate: "",
    endDate: "",
    status: "active",
  });

  /* ========================================
     CATEGORY MODAL
  ======================================== */

  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);

  const [savingCategory, setSavingCategory] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  /* ========================================
     TRANSFER MODAL
  ======================================== */

  const [showTransferModal, setShowTransferModal] = useState(false);

  const [savingTransfer, setSavingTransfer] = useState(false);

  const [transferForm, setTransferForm] = useState({
    fromFundId: "",
    toFundId: "",
    amount: "",
    transferDate: new Date().toISOString().split("T")[0],
    reason: "",
    referenceNumber: "",
  });

  const [editingTransfer, setEditingTransfer] = useState(null);

  function openEditTransfer(transfer) {
    setEditingTransfer(transfer);

    setTransferForm({
      fromFundId: transfer.from_fund_id,

      toFundId: transfer.to_fund_id,

      amount: transfer.amount,

      transferDate: transfer.transfer_date,

      reason: transfer.reason || "",

      referenceNumber: transfer.reference_number || "",
    });

    setError("");
    setSuccess("");

    setShowTransferModal(true);
  }

  /* ========================================
     LOAD ALL
  ======================================== */

  async function loadFunds() {
    setLoading(true);
    setError("");

    const [
      fundsResult,
      transactionsResult,
      websiteCollectionsResult,
      categoriesResult,
      transfersResult,
    ] = await Promise.all([
      supabase
        .from("funds")
        .select(
          `
  id,
  name,
  description,
  is_active,
  category_id,
  fund_type,
  include_in_masjid_totals,
  start_date,
  end_date,
  status
`,
        )
        .order("name"),

      supabase
        .from("transactions")
        .select(
          `
          id,
          fund_id,
          type,
          amount,
          transaction_date
        `,
        )
        .order("transaction_date", {
          ascending: false,
        }),

      supabase
        .from("donation_requests")
        .select(
          `
          id,
          fund_id,
          amount,
          status
        `,
        )
        .eq("status", "confirmed"),

      supabase
        .from("fund_categories")
        .select(
          `
          id,
          name,
          description,
          is_active,
          created_at
        `,
        )
        .order("name"),

      supabase
        .from("fund_transfers")
        .select(
          `
          id,
          from_fund_id,
          to_fund_id,
          amount,
          transfer_date,
          reason,
          reference_number,
          created_at
        `,
        )
        .order("transfer_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        }),
    ]);

    const results = [
      fundsResult,
      transactionsResult,
      websiteCollectionsResult,
      categoriesResult,
      transfersResult,
    ];

    const failed = results.find((result) => result.error);

    if (failed) {
      setError(failed.error.message);

      setLoading(false);
      return;
    }

    setFunds(fundsResult.data || []);

    setTransactions(transactionsResult.data || []);

    setWebsiteCollections(websiteCollectionsResult.data || []);

    setCategories(categoriesResult.data || []);

    setFundTransfers(transfersResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) {
      loadFunds();
    }
  }, [authLoading]);

  async function deleteTransfer(transfer) {
    if (!isAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Delete this ₹${Number(transfer.amount).toLocaleString(
        "en-IN",
      )} transfer from "${getFundName(
        transfer.from_fund_id,
      )}" to "${getFundName(
        transfer.to_fund_id,
      )}"? This will reverse the transfer's effect on both fund balances.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("fund_transfers")
      .delete()
      .eq("id", transfer.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadFunds();

    setSuccess("Fund transfer deleted successfully.");
  }
  /* ========================================
     HELPERS
  ======================================== */

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getCategoryName(categoryId) {
    return (
      categories.find((category) => category.id === categoryId)?.name ||
      "Uncategorized"
    );
  }

  function getFundName(fundId) {
    return funds.find((fund) => fund.id === fundId)?.name || "Unknown Fund";
  }

  /* ========================================
     FUND DATA
  ======================================== */

  const fundData = useMemo(() => {
    return funds.map((fund) => {
      const fundTransactions = transactions.filter(
        (transaction) => transaction.fund_id === fund.id,
      );

      const income = fundTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0,
        );

      const expenses = fundTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0,
        );

      const incomingTransfers = fundTransfers
        .filter((transfer) => transfer.to_fund_id === fund.id)
        .reduce((total, transfer) => total + Number(transfer.amount || 0), 0);

      const outgoingTransfers = fundTransfers
        .filter((transfer) => transfer.from_fund_id === fund.id)
        .reduce((total, transfer) => total + Number(transfer.amount || 0), 0);

      const websiteCollection = websiteCollections
        .filter((request) => request.fund_id === fund.id)
        .reduce((total, request) => total + Number(request.amount || 0), 0);

      const balance = income - expenses + incomingTransfers - outgoingTransfers;

      return {
        ...fund,

        income,

        expenses,

        incomingTransfers,

        outgoingTransfers,

        websiteCollection,

        balance,

        transactionCount: fundTransactions.length,
      };
    });
  }, [funds, transactions, websiteCollections, fundTransfers]);

  /* ========================================
     TOTALS
  ======================================== */

  const masjidFundData = fundData.filter(
    (fund) => fund.include_in_masjid_totals !== false,
  );

  const separateFundData = fundData.filter(
    (fund) => fund.include_in_masjid_totals === false,
  );

  const totalIncome = masjidFundData.reduce(
    (total, fund) => total + fund.income,
    0,
  );

  const totalExpenses = masjidFundData.reduce(
    (total, fund) => total + fund.expenses,
    0,
  );

  const totalIncomingTransfers = masjidFundData.reduce(
    (total, fund) => total + fund.incomingTransfers,
    0,
  );

  const totalOutgoingTransfers = masjidFundData.reduce(
    (total, fund) => total + fund.outgoingTransfers,
    0,
  );

  const totalWebsiteCollection = masjidFundData.reduce(
    (total, fund) => total + fund.websiteCollection,
    0,
  );

  const totalBalance =
    totalIncome -
    totalExpenses +
    totalIncomingTransfers -
    totalOutgoingTransfers;

  const activeFunds = funds.filter(
    (fund) =>
      (fund.status || (fund.is_active ? "active" : "closed")) === "active",
  );

  /* ========================================
     FUND MODAL
  ======================================== */

  function openNewFund() {
    setEditingFund(null);

    setFundForm({
      name: "",
      description: "",
      categoryId: categories.find((category) => category.is_active)?.id || "",
      fundType: "masjid",
      includeInMasjidTotals: true,
      startDate: "",
      endDate: "",
      status: "active",
    });

    setError("");
    setSuccess("");

    setShowFundModal(true);
  }

  function openEditFund(fund) {
    setEditingFund(fund);

    setFundForm({
      name: fund.name || "",

      description: fund.description || "",

      categoryId: fund.category_id || "",

      fundType: fund.fund_type || "masjid",

      includeInMasjidTotals: fund.include_in_masjid_totals !== false,

      startDate: fund.start_date || "",

      endDate: fund.end_date || "",

      status: fund.status || (fund.is_active ? "active" : "closed"),
    });

    setError("");
    setSuccess("");

    setShowFundModal(true);
  }

  async function saveFund(event) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    if (!fundForm.name.trim()) {
      setError("Fund name is required.");

      return;
    }

    if (
      fundForm.endDate &&
      fundForm.startDate &&
      fundForm.endDate < fundForm.startDate
    ) {
      setError("End date cannot be earlier than the start date.");

      return;
    }

    setSavingFund(true);

    setError("");
    setSuccess("");

    try {
      const payload = {
        name: fundForm.name.trim(),

        description: fundForm.description.trim() || null,

        category_id: fundForm.categoryId || null,

        fund_type: fundForm.fundType,

        include_in_masjid_totals: fundForm.includeInMasjidTotals,

        start_date: fundForm.startDate || null,

        end_date: fundForm.endDate || null,

        status: fundForm.status,

        is_active: fundForm.status === "active" || fundForm.status === "draft",
      };

      if (editingFund) {
        const { error: updateError } = await supabase
          .from("funds")
          .update(payload)
          .eq("id", editingFund.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setSuccess("Fund updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("funds")
          .insert(payload);

        if (insertError) {
          throw new Error(insertError.message);
        }

        setSuccess("Fund created successfully.");
      }

      setShowFundModal(false);

      await loadFunds();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFund(false);
    }
  }

  async function deleteFund(fund) {
    if (!isAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${fund.name}"? This can only be done if the fund has no financial records or transfers.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      // Check accounting transactions
      const { count: transactionCount, error: transactionCheckError } =
        await supabase
          .from("transactions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("fund_id", fund.id);

      if (transactionCheckError) {
        throw new Error(transactionCheckError.message);
      }

      // Check transfers FROM this fund
      const { count: outgoingCount, error: outgoingCheckError } = await supabase
        .from("fund_transfers")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("from_fund_id", fund.id);

      if (outgoingCheckError) {
        throw new Error(outgoingCheckError.message);
      }

      // Check transfers TO this fund
      const { count: incomingCount, error: incomingCheckError } = await supabase
        .from("fund_transfers")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("to_fund_id", fund.id);

      if (incomingCheckError) {
        throw new Error(incomingCheckError.message);
      }

      const transactionTotal = transactionCount || 0;

      const transferTotal = (outgoingCount || 0) + (incomingCount || 0);

      if (transactionTotal > 0 || transferTotal > 0) {
        setError(
          `"${fund.name}" cannot be deleted because it has ${transactionTotal} transaction${transactionTotal === 1 ? "" : "s"} and ${transferTotal} transfer${transferTotal === 1 ? "" : "s"}. Close the fund instead to preserve its financial history.`,
        );

        return;
      }

      // Check confirmed website contributions
      const { count: websiteCount, error: websiteCheckError } = await supabase
        .from("donation_requests")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("fund_id", fund.id)
        .eq("status", "confirmed");

      if (websiteCheckError) {
        throw new Error(websiteCheckError.message);
      }

      if ((websiteCount || 0) > 0) {
        setError(
          `"${fund.name}" cannot be deleted because it has confirmed website contributions. Close the fund instead.`,
        );

        return;
      }

      const { error: deleteError } = await supabase
        .from("funds")
        .delete()
        .eq("id", fund.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await loadFunds();

      setSuccess(`"${fund.name}" was permanently deleted.`);
    } catch (err) {
      setError(err.message);
    }
  }
  /* ========================================
     CATEGORY MODAL
  ======================================== */

  function openNewCategory() {
    setEditingCategory(null);

    setCategoryForm({
      name: "",
      description: "",
      isActive: true,
    });

    setError("");
    setSuccess("");

    setShowCategoryModal(true);
  }

  function openEditCategory(category) {
    setEditingCategory(category);

    setCategoryForm({
      name: category.name || "",

      description: category.description || "",

      isActive: category.is_active,
    });

    setError("");
    setSuccess("");

    setShowCategoryModal(true);
  }

  async function saveCategory(event) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    if (!categoryForm.name.trim()) {
      setError("Category name is required.");

      return;
    }

    setSavingCategory(true);

    setError("");
    setSuccess("");

    try {
      const payload = {
        name: categoryForm.name.trim(),

        description: categoryForm.description.trim() || null,

        is_active: categoryForm.isActive,
      };

      if (editingCategory) {
        const { error: updateError } = await supabase
          .from("fund_categories")
          .update(payload)
          .eq("id", editingCategory.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setSuccess("Category updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("fund_categories")
          .insert(payload);

        if (insertError) {
          throw new Error(insertError.message);
        }

        setSuccess("Category created successfully.");
      }

      setShowCategoryModal(false);

      await loadFunds();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCategory(false);
    }
  }

  async function deleteCategory(category) {
    if (!isAdmin) {
      return;
    }

    const fundsUsingCategory = funds.filter(
      (fund) => fund.category_id === category.id,
    );

    if (fundsUsingCategory.length > 0) {
      setError(
        `"${category.name}" cannot be deleted because ${fundsUsingCategory.length} fund${fundsUsingCategory.length === 1 ? " is" : "s are"} using this category. Reassign those funds first, or deactivate the category.`,
      );

      return;
    }

    const confirmed = window.confirm(
      `Permanently delete the "${category.name}" category? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("fund_categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      setError(error.message);

      return;
    }

    await loadFunds();

    setSuccess(`"${category.name}" was permanently deleted.`);
  }

  /* ========================================
     TRANSFER MODAL
  ======================================== */

  function openTransferModal() {
    setEditingTransfer(null);

    setTransferForm({
      fromFundId: activeFunds[0]?.id || "",

      toFundId: activeFunds[1]?.id || activeFunds[0]?.id || "",

      amount: "",

      transferDate: new Date().toISOString().split("T")[0],

      reason: "",

      referenceNumber: "",
    });

    setError("");
    setSuccess("");

    setShowTransferModal(true);
  }

  const selectedSourceFund = fundData.find(
    (fund) => fund.id === transferForm.fromFundId,
  );

  async function saveTransfer(event) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    const amount = Number(transferForm.amount);

    if (!transferForm.fromFundId) {
      setError("Please select the source fund.");

      return;
    }

    if (!transferForm.toFundId) {
      setError("Please select the destination fund.");

      return;
    }

    if (transferForm.fromFundId === transferForm.toFundId) {
      setError("Source and destination funds must be different.");

      return;
    }

    if (!amount || amount <= 0) {
      setError("Please enter a valid transfer amount.");

      return;
    }

    if (amount > Number(selectedSourceFund?.balance || 0)) {
      setError(
        `Insufficient available balance in ${selectedSourceFund?.name || "the source fund"}.`,
      );

      return;
    }

    setSavingTransfer(true);

    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be signed in.");
      }

      let transferError = null;

      if (editingTransfer) {
        const { error } = await supabase
          .from("fund_transfers")
          .update({
            from_fund_id: transferForm.fromFundId,

            to_fund_id: transferForm.toFundId,

            amount,

            transfer_date: transferForm.transferDate,

            reason: transferForm.reason.trim() || null,

            reference_number: transferForm.referenceNumber.trim() || null,
          })
          .eq("id", editingTransfer.id);

        transferError = error;
      } else {
        const { error } = await supabase.from("fund_transfers").insert({
          from_fund_id: transferForm.fromFundId,

          to_fund_id: transferForm.toFundId,

          amount,

          transfer_date: transferForm.transferDate,

          reason: transferForm.reason.trim() || null,

          reference_number: transferForm.referenceNumber.trim() || null,

          created_by: user.id,
        });

        transferError = error;
      }

      if (transferError) {
        throw new Error(transferError.message);
      }

      setShowTransferModal(false);

      setEditingTransfer(null);

      setSuccess(
        editingTransfer
          ? "Fund transfer updated successfully."
          : "Fund transfer recorded successfully.",
      );

      await loadFunds();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTransfer(false);
    }
  }

  /* ========================================
     LOADING
  ======================================== */

  if (authLoading || loading) {
    return <div className="admin-loading">Loading funds...</div>;
  }

  /* ========================================
     ACCESS
  ======================================== */

  if (!member || !member.is_active || !isAdmin) {
    return (
      <div className="admin-access-denied">
        <div>
          <h1>Access denied</h1>

          <p>Only administrators can manage funds.</p>
        </div>
      </div>
    );
  }

  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="fund-management-page">
      {/* HEADER */}

      <div className="admin-page-heading">
        <div>
          <p className="section-label">FINANCIAL MANAGEMENT</p>

          <h1>Funds</h1>

          <p>Manage funds, categories, balances and internal transfers.</p>
        </div>

        <button type="button" className="secondary-button" onClick={loadFunds}>
          ↻ Refresh
        </button>
      </div>

      {error && <div className="form-message error">{error}</div>}

      {success && <div className="form-message success">{success}</div>}

      {/* TABS */}

      <div className="fund-management-tabs">
        <button
          type="button"
          className={activeTab === "funds" ? "active" : ""}
          onClick={() => setActiveTab("funds")}
        >
          Funds
        </button>

        <button
          type="button"
          className={activeTab === "categories" ? "active" : ""}
          onClick={() => setActiveTab("categories")}
        >
          Categories
        </button>

        <button
          type="button"
          className={activeTab === "transfers" ? "active" : ""}
          onClick={() => setActiveTab("transfers")}
        >
          Transfers
        </button>
      </div>

      {/* ========================================
          FUNDS TAB
      ======================================== */}

      {activeTab === "funds" && (
        <>
          <div className="fund-toolbar">
            <div>
              <span>{activeFunds.length}</span>

              <small>active funds</small>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={openNewFund}
            >
              + New Fund
            </button>
          </div>

          {/* SUMMARY */}

          <div className="fund-summary-cards">
            <div className="fund-summary-card">
              <span>TOTAL BALANCE</span>

              <strong>{formatCurrency(totalBalance)}</strong>
            </div>

            <div className="fund-summary-card">
              <span>TOTAL INCOME</span>

              <strong className="fund-income">
                {formatCurrency(totalIncome)}
              </strong>
            </div>

            <div className="fund-summary-card">
              <span>TOTAL EXPENSES</span>

              <strong className="fund-expense">
                {formatCurrency(totalExpenses)}
              </strong>
            </div>

            <div className="fund-summary-card">
              <span>WEBSITE COLLECTIONS</span>

              <strong className="fund-website-total">
                {formatCurrency(totalWebsiteCollection)}
              </strong>
            </div>
          </div>

          {/* FUND CARDS */}

          <div className="fund-management-grid">
            {masjidFundData
              .filter((fund) => fund.status !== "closed")
              .map((fund) => (
                <article className="fund-management-card" key={fund.id}>
                  <div className="fund-card-top">
                    <div>
                      <div className="fund-badge-row">
                        <span className="fund-active-badge">
                          {(
                            fund.status ||
                            (fund.is_active ? "active" : "closed")
                          ).toUpperCase()}
                        </span>

                        <span className="fund-category-badge">
                          {getCategoryName(fund.category_id)}
                        </span>
                      </div>

                      <h2>{fund.name}</h2>
                    </div>

                    <span className="fund-symbol">₹</span>
                  </div>

                  <p className="fund-description">
                    {fund.description || "No description provided."}
                  </p>

                  <div className="fund-period">
                    <span>FUND PERIOD</span>

                    <strong>
                      {fund.start_date
                        ? formatDate(fund.start_date)
                        : "No start date"}
                      {" → "}
                      {fund.end_date ? formatDate(fund.end_date) : "Ongoing"}
                    </strong>
                  </div>

                  <div className="fund-balance">
                    <span>CURRENT BALANCE</span>

                    <strong>{formatCurrency(fund.balance)}</strong>
                  </div>

                  <div className="fund-details">
                    <div>
                      <span>Income</span>

                      <strong className="fund-income">
                        {formatCurrency(fund.income)}
                      </strong>
                    </div>

                    <div>
                      <span>Expenses</span>

                      <strong className="fund-expense">
                        {formatCurrency(fund.expenses)}
                      </strong>
                    </div>

                    <div>
                      <span>Transfers In</span>

                      <strong>{formatCurrency(fund.incomingTransfers)}</strong>
                    </div>

                    <div>
                      <span>Transfers Out</span>

                      <strong>{formatCurrency(fund.outgoingTransfers)}</strong>
                    </div>
                  </div>

                  <div className="fund-website-collection">
                    <div>
                      <span>WEBSITE COLLECTION</span>

                      <p>Confirmed website contribution requests.</p>
                    </div>

                    <strong>{formatCurrency(fund.websiteCollection)}</strong>
                  </div>

                  <div className="fund-card-footer">
                    <span>{fund.transactionCount} accounting transactions</span>

                    <div className="fund-card-actions">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => openEditFund(fund)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="member-action danger"
                        onClick={() => deleteFund(fund)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          </div>

          {/* ========================================
    SEPARATE FUNDS
======================================== */}

{separateFundData.length > 0 && (

  <section className="separate-funds-section">

    <div className="fund-section-header">

      <div>

        <p className="section-label">
          SEPARATE FUNDS
        </p>

        <h2>
          Funds Managed Separately
        </h2>

        <p>
          These funds are recorded independently
          and are not included in the Masjid's
          financial totals.
        </p>

      </div>

    </div>


    <div className="fund-management-grid">

      {separateFundData
        .filter(
          (fund) =>
            fund.status !== "closed"
        )
        .map(
          (fund) => (

            <article
              className="fund-management-card separate-fund-card"
              key={fund.id}
            >

              <div className="fund-card-top">

                <div>

                  <div className="fund-badge-row">

                    <span className="fund-active-badge">
                      SEPARATE
                    </span>

                    <span className="fund-category-badge">
                      {getCategoryName(
                        fund.category_id
                      )}
                    </span>

                  </div>


                  <h2>
                    {fund.name}
                  </h2>

                </div>


                <span className="fund-symbol">
                  ₹
                </span>

              </div>


              <p className="fund-description">
                {fund.description ||
                  "Managed separately from Masjid funds."}
              </p>


              <div className="fund-balance">

                <span>
                  CURRENT BALANCE
                </span>

                <strong>
                  {formatCurrency(
                    fund.balance
                  )}
                </strong>

              </div>


              <div className="fund-details">

                <div>

                  <span>
                    Income
                  </span>

                  <strong className="fund-income">
                    {formatCurrency(
                      fund.income
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Expenses
                  </span>

                  <strong className="fund-expense">
                    {formatCurrency(
                      fund.expenses
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Transactions
                  </span>

                  <strong>
                    {fund.transactionCount}
                  </strong>

                </div>

              </div>


              <div className="fund-card-footer">

                <span>
                  Not included in Masjid totals
                </span>

                <div className="fund-card-actions">

                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      openEditFund(fund)
                    }
                  >
                    Edit
                  </button>


                  <button
                    type="button"
                    className="member-action danger"
                    onClick={() =>
                      deleteFund(fund)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            </article>

          )
        )}

    </div>

  </section>

)}

          {/* ACCOUNTING NOTE */}

          <div className="fund-accounting-note">
            <span>✓</span>

            <div>
              <strong>Balance is calculated automatically</strong>

              <p>
                Income and expenses come from accounting transactions. Fund
                transfers move existing money between funds and do not create
                new income or expenses.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ========================================
          CATEGORIES TAB
      ======================================== */}

      {activeTab === "categories" && (
        <div className="fund-category-management">
          <div className="fund-section-header">
            <div>
              <p className="section-label">FUND STRUCTURE</p>

              <h2>Fund Categories</h2>

              <p>
                Categories classify different types of funds. A category can
                contain many separate funds.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={openNewCategory}
            >
              + Add Category
            </button>
          </div>

          <div className="fund-category-grid">
            {categories.map((category) => {
              const categoryFunds = funds.filter(
                (fund) => fund.category_id === category.id,
              );

              return (
                <article
                  className={
                    category.is_active
                      ? "fund-category-card"
                      : "fund-category-card inactive"
                  }
                  key={category.id}
                >
                  <div className="fund-category-card-top">
                    <div className="fund-category-icon">◇</div>

                    <span
                      className={
                        category.is_active
                          ? "category-status active"
                          : "category-status inactive"
                      }
                    >
                      {category.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  <h3>{category.name}</h3>

                  <p>{category.description || "No description provided."}</p>

                  <div className="fund-category-meta">
                    <strong>{categoryFunds.length}</strong>

                    <span>
                      fund
                      {categoryFunds.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="fund-category-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openEditCategory(category)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="member-action danger"
                      onClick={() => deleteCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================
          TRANSFERS TAB
      ======================================== */}

      {activeTab === "transfers" && (
        <div className="fund-transfer-management">
          <div className="fund-section-header">
            <div>
              <p className="section-label">INTERNAL MOVEMENT</p>

              <h2>Fund Transfers</h2>

              <p>
                Move available money from one fund to another without recording
                it as new income or an expense.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={openTransferModal}
            >
              + New Transfer
            </button>
          </div>

          <div className="fund-transfer-balance-note">
            <span>↔</span>

            <div>
              <strong>Transfers preserve the accounting trail</strong>

              <p>
                A transfer reduces the source fund and increases the destination
                fund. It does not change the overall combined balance.
              </p>
            </div>
          </div>

          {fundTransfers.length === 0 ? (
            <div className="admin-empty-card">
              <h3>No transfers yet</h3>

              <p>Internal fund movements will appear here.</p>
            </div>
          ) : (
            <div className="fund-transfer-table-wrap">
              <table className="fund-transfer-table">
                <thead>
                  <tr>
                    <th>Date</th>

                    <th>From</th>

                    <th>To</th>

                    <th>Reason</th>

                    <th>Reference</th>

                    <th className="amount-column">Amount</th>

                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {fundTransfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td>{formatDate(transfer.transfer_date)}</td>

                      <td>
                        <strong>{getFundName(transfer.from_fund_id)}</strong>
                      </td>

                      <td>
                        <strong>{getFundName(transfer.to_fund_id)}</strong>
                      </td>

                      <td>{transfer.reason || "—"}</td>

                      <td>{transfer.reference_number || "—"}</td>

                      <td className="amount-column">
                        <strong>{formatCurrency(transfer.amount)}</strong>
                      </td>

                      <td>
                        <div className="fund-transfer-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => openEditTransfer(transfer)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="member-action danger"
                            onClick={() => deleteTransfer(transfer)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================
          FUND MODAL
      ======================================== */}

      {showFundModal && (
        <div className="fund-modal-overlay">
          <div className="fund-modal">
            <button
              type="button"
              className="fund-modal-close"
              onClick={() => setShowFundModal(false)}
              disabled={savingFund}
            >
              ×
            </button>

            <p className="section-label">FUND MANAGEMENT</p>

            <h2>{editingFund ? "Edit Fund" : "Create New Fund"}</h2>

            <p className="fund-modal-intro">
              A fund is a specific financial bucket. You can have multiple funds
              under the same category.
            </p>

            <form onSubmit={saveFund}>
              <div className="form-field">
                <label>Fund Name</label>

                <input
                  type="text"
                  value={fundForm.name}
                  onChange={(event) =>
                    setFundForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Masjid Roof Reconstruction — 2026"
                  required
                />
              </div>

              <div className="fund-modal-grid">
                <div className="form-field">
                  <label>Category</label>

                  <select
                    value={fundForm.categoryId}
                    onChange={(event) =>
                      setFundForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">No category</option>

                    {categories
                      .filter((category) => category.is_active)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Status</label>

                  <select
                    value={fundForm.status}
                    onChange={(event) =>
                      setFundForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="draft">Draft</option>

                    <option value="active">Active</option>

                    <option value="completed">Completed</option>

                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* ==================================
    FUND TYPE & ACCOUNTING
================================== */}

              <div className="fund-modal-grid">
                <div className="form-field">
                  <label>Fund Type</label>

                  <select
                    value={fundForm.fundType}
                    onChange={(event) =>
                      setFundForm((current) => ({
                        ...current,

                        fundType: event.target.value,

                        includeInMasjidTotals:
                          event.target.value === "masjid"
                            ? true
                            : current.includeInMasjidTotals,
                      }))
                    }
                  >
                    <option value="masjid">Masjid Fund</option>

                    <option value="separate">Separate Fund</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Accounting Treatment</label>

                  <select
                    value={
                      fundForm.includeInMasjidTotals ? "included" : "excluded"
                    }
                    onChange={(event) =>
                      setFundForm((current) => ({
                        ...current,

                        includeInMasjidTotals:
                          event.target.value === "included",
                      }))
                    }
                    disabled={fundForm.fundType === "masjid"}
                  >
                    <option value="included">Include in Masjid totals</option>

                    <option value="excluded">
                      Keep separate from Masjid totals
                    </option>
                  </select>
                </div>
              </div>

              <div className="fund-modal-grid">
                <div className="form-field">
                  <label>Start Date</label>

                  <input
                    type="date"
                    value={fundForm.startDate}
                    onChange={(event) =>
                      setFundForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>End Date</label>

                  <input
                    type="date"
                    value={fundForm.endDate}
                    onChange={(event) =>
                      setFundForm((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Description</label>

                <textarea
                  rows="4"
                  value={fundForm.description}
                  onChange={(event) =>
                    setFundForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the purpose of this fund..."
                />
              </div>

              <div className="fund-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowFundModal(false)}
                  disabled={savingFund}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingFund}
                >
                  {savingFund
                    ? "Saving..."
                    : editingFund
                      ? "Save Changes"
                      : "Create Fund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          CATEGORY MODAL
      ======================================== */}

      {showCategoryModal && (
        <div className="fund-modal-overlay">
          <div className="fund-modal small">
            <button
              type="button"
              className="fund-modal-close"
              onClick={() => setShowCategoryModal(false)}
              disabled={savingCategory}
            >
              ×
            </button>

            <p className="section-label">FUND STRUCTURE</p>

            <h2>{editingCategory ? "Edit Category" : "Add Category"}</h2>

            <form onSubmit={saveCategory}>
              <div className="form-field">
                <label>Category Name</label>

                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Reconstruction"
                  required
                />
              </div>

              <div className="form-field">
                <label>Description</label>

                <textarea
                  rows="4"
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe this category..."
                />
              </div>

              <div className="category-modal-status">
                <div>
                  <strong>Category Status</strong>

                  <p>
                    Inactive categories won't be available when creating new
                    funds.
                  </p>
                </div>

                <button
                  type="button"
                  className={
                    categoryForm.isActive
                      ? "user-status-toggle active"
                      : "user-status-toggle inactive"
                  }
                  onClick={() =>
                    setCategoryForm((current) => ({
                      ...current,
                      isActive: !current.isActive,
                    }))
                  }
                >
                  <span />

                  {categoryForm.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="fund-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowCategoryModal(false)}
                  disabled={savingCategory}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingCategory}
                >
                  {savingCategory
                    ? "Saving..."
                    : editingCategory
                      ? "Save Changes"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          TRANSFER MODAL
      ======================================== */}

      {showTransferModal && (
        <div className="fund-modal-overlay">
          <div className="fund-modal">
            <button
              type="button"
              className="fund-modal-close"
              onClick={() => setShowTransferModal(false)}
              disabled={savingTransfer}
            >
              ×
            </button>

            <p className="section-label">FUND MOVEMENT</p>

            <h2>
              {editingTransfer
                ? "Edit Fund Transfer"
                : "Transfer Between Funds"}
            </h2>

            <p className="fund-modal-intro">
              This moves existing money from one fund to another. It does not
              create income or an expense.
            </p>

            <form onSubmit={saveTransfer}>
              <div className="fund-transfer-route">
                <div className="form-field">
                  <label>From Fund</label>

                  <select
                    value={transferForm.fromFundId}
                    onChange={(event) =>
                      setTransferForm((current) => ({
                        ...current,
                        fromFundId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select source fund</option>

                    {activeFunds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {fund.name} — {formatCurrency(fund.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fund-transfer-arrow">→</div>

                <div className="form-field">
                  <label>To Fund</label>

                  <select
                    value={transferForm.toFundId}
                    onChange={(event) =>
                      setTransferForm((current) => ({
                        ...current,
                        toFundId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select destination fund</option>

                    {activeFunds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {fund.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Amount</label>

                <div className="currency-input">
                  <span>₹</span>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={transferForm.amount}
                    onChange={(event) =>
                      setTransferForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                {selectedSourceFund && (
                  <small className="fund-available-note">
                    Available: {formatCurrency(selectedSourceFund.balance)}
                  </small>
                )}
              </div>

              <div className="fund-modal-grid">
                <div className="form-field">
                  <label>Transfer Date</label>

                  <input
                    type="date"
                    value={transferForm.transferDate}
                    onChange={(event) =>
                      setTransferForm((current) => ({
                        ...current,
                        transferDate: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Reference Number</label>

                  <input
                    type="text"
                    value={transferForm.referenceNumber}
                    onChange={(event) =>
                      setTransferForm((current) => ({
                        ...current,
                        referenceNumber: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Reason</label>

                <textarea
                  rows="4"
                  value={transferForm.reason}
                  onChange={(event) =>
                    setTransferForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Why is this money being transferred?"
                  required
                />
              </div>

              <div className="fund-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowTransferModal(false)}
                  disabled={savingTransfer}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingTransfer}
                >
                  {savingTransfer
                    ? editingTransfer
                      ? "Saving..."
                      : "Recording..."
                    : editingTransfer
                      ? "Save Changes"
                      : "Record Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Funds;
