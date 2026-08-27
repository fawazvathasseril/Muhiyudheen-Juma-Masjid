import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";


function TransactionDetails() {

  const { id } =
    useParams();


  const {
    member,
    loading: authLoading,
  } = useAuth();


  /* ========================================
     DATA
  ======================================== */

  const [
    transaction,
    setTransaction,
  ] = useState(null);


  const [
    funds,
    setFunds,
  ] = useState([]);


  const [
    expenseSuggestions,
    setExpenseSuggestions,
  ] = useState([]);


  const [
    receiptUrl,
    setReceiptUrl,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    editing,
    setEditing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  /* ========================================
     EDIT FORM
  ======================================== */

  const [
    form,
    setForm,
  ] = useState({
    amount: "",
    fundId: "",
    category: "",
    expensePurpose: "",
    description: "",
    transactionDate: "",
    referenceNumber: "",
    partyName: "",
    paymentMethod: "cash",
  });


  const canEdit =
    member?.role === "admin" ||
    member?.role === "treasurer";


  /* ========================================
     LOAD TRANSACTION
  ======================================== */

  async function loadTransaction() {

    setLoading(true);
    setError("");
    setMessage("");


    const [
      transactionResult,
      fundsResult,
      expenseSuggestionsResult,
    ] =
      await Promise.all([

        /* TRANSACTION */

        supabase
          .from("transactions")
          .select(`
            id,
            type,
            amount,
            category,
            description,
            transaction_date,
            reference_number,
            party_name,
            payment_method,
            receipt_url,
            created_at,
            funds (
              id,
              name
            )
          `)
          .eq(
            "id",
            id
          )
          .single(),


        /* ACTIVE FUNDS */

        supabase
          .from("funds")
          .select(
            "id, name"
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "name"
          ),


        /* PREVIOUSLY USED EXPENSE DESCRIPTIONS */

        supabase
          .from("transactions")
          .select("category")
          .eq("type", "expense")
          .not("category", "is", null)
          .order("created_at", {
            ascending: false,
          })
          .limit(100),
      ]);


    if (
      transactionResult.error
    ) {

      setError(
        transactionResult.error.message
      );

      setLoading(false);

      return;
    }


    if (
      fundsResult.error
    ) {

      setError(
        fundsResult.error.message
      );

      setLoading(false);

      return;
    }


    if (
      expenseSuggestionsResult.error
    ) {

      setError(
        expenseSuggestionsResult.error.message
      );

      setLoading(false);

      return;
    }


    const data =
      transactionResult.data;


    setTransaction(
      data
    );


    setFunds(
      fundsResult.data || []
    );


    const defaultExpenseSuggestions = [
      "Plumbing",
      "Electricity",
      "Stationery",
      "Newspaper",
      "Usthad Salaries",
      "Nails / Hammer",
      "Tiles / Granite / Adhesive",
      "Tiles Labour",
      "Coconut Labour",
      "Solar Panel",
      "General Pallipani",
    ];


    const historicalExpenseSuggestions =
      (expenseSuggestionsResult.data || [])
        .map(
          (item) =>
            String(
              item.category || ""
            ).trim()
        )
        .filter(Boolean);


    const uniqueSuggestions =
      Array.from(
        new Set([
          ...defaultExpenseSuggestions,
          ...historicalExpenseSuggestions,
        ])
      );


    setExpenseSuggestions(
      uniqueSuggestions
    );


    setForm({
      amount:
        data.amount ?? "",

      fundId:
        data.funds?.id || "",

      category:
        data.type === "income"
          ? data.category || ""
          : "",

      expensePurpose:
        data.type === "expense"
          ? data.category || ""
          : "",

      description:
        data.description || "",

      transactionDate:
        data.transaction_date || "",

      referenceNumber:
        data.reference_number || "",

      partyName:
        data.party_name || "",

      paymentMethod:
        data.payment_method ||
        "cash",
    });


    /* ======================================
       RECEIPT
    ====================================== */

    if (
      data.receipt_url
    ) {

      const {
        data:
          signedData,
        error:
          signedError,
      } =
        await supabase.storage
          .from(
            "receipts"
          )
          .createSignedUrl(
            data.receipt_url,
            60 * 10
          );


      if (
        !signedError
      ) {

        setReceiptUrl(
          signedData?.signedUrl ||
          ""
        );
      }
    } else {

      setReceiptUrl(
        ""
      );
    }


    setLoading(
      false
    );
  }


  useEffect(() => {

    if (
      !authLoading
    ) {

      loadTransaction();
    }

  }, [
    id,
    authLoading,
  ]);


  /* ========================================
     FORM HANDLER
  ======================================== */

  function handleChange(
    event
  ) {

    const {
      name,
      value,
    } =
      event.target;


    setForm(
      (current) => ({
        ...current,

        [name]:
          value,
      })
    );
  }


  /* ========================================
     SAVE EDIT
  ======================================== */

  async function handleSave(
    event
  ) {

    event.preventDefault();


    if (
      !canEdit
    ) {

      setError(
        "You do not have permission to edit transactions."
      );

      return;
    }


    setSaving(
      true
    );

    setError("");
    setMessage("");


    const amount =
      Number(
        form.amount
      );


    if (
      !amount ||
      amount <= 0
    ) {

      setError(
        "Please enter a valid amount."
      );

      setSaving(
        false
      );

      return;
    }


    if (
      !form.fundId
    ) {

      setError(
        "Please select a fund."
      );

      setSaving(
        false
      );

      return;
    }


    const expensePurpose =
      form.expensePurpose.trim();


    if (
      transaction.type === "income" &&
      !form.category.trim()
    ) {

      setError(
        "Please enter a category."
      );

      setSaving(
        false
      );

      return;
    }


    try {

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "transactions"
          )
          .update({

            amount,

            fund_id:
              form.fundId,

            category:
              transaction.type === "expense"
                ? (
                    expensePurpose ||
                    null
                  )
                : form.category.trim(),

            description:
              form.description.trim() ||
              null,

            transaction_date:
              form.transactionDate,

            reference_number:
              form.referenceNumber.trim() ||
              null,

            party_name:
              transaction.type === "income"
                ? (
                    form.partyName.trim() ||
                    null
                  )
                : (
                    transaction.party_name ||
                    null
                  ),

            payment_method:
              form.paymentMethod,
          })
          .eq(
            "id",
            id
          );


      if (
        updateError
      ) {

        throw updateError;
      }


      setEditing(
        false
      );


      setMessage(
        "Transaction updated successfully."
      );


      await loadTransaction();

    } catch (
      updateError
    ) {

      setError(
        updateError?.message ||
          "Unable to update the transaction."
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  async function handleDelete() {

  if (
    member?.role !== "admin"
  ) {
    setError(
      "Only administrators can delete transactions."
    );

    return;
  }


  const confirmed =
    window.confirm(
      `Permanently delete this ${transaction.type === "income" ? "donation" : "expense"} of ${formatCurrency(
        Number(transaction.amount)
      )}? This cannot be undone.`
    );


  if (!confirmed) {
    return;
  }


  setError("");
  setMessage("");


  try {

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "transactions"
        )
        .delete()
        .eq(
          "id",
          id
        );


    if (
      deleteError
    ) {
      throw deleteError;
    }


    /*
      For now, after deletion we'll return
      to Reports.
    */

    window.location.href =
      "/admin/reports";

  } catch (
    deleteError
  ) {

    setError(
      deleteError?.message ||
        "Unable to delete the transaction."
    );
  }
}
  /* ========================================
     CANCEL EDIT
  ======================================== */

  function cancelEdit() {

    if (
      transaction
    ) {

      setForm({
        amount:
          transaction.amount ??
          "",

        fundId:
          transaction.funds?.id ||
          "",

        category:
          transaction.type === "income"
            ? (
                transaction.category ||
                ""
              )
            : "",

        expensePurpose:
          transaction.type === "expense"
            ? (
                transaction.category ||
                ""
              )
            : "",

        description:
          transaction.description ||
          "",

        transactionDate:
          transaction.transaction_date ||
          "",

        referenceNumber:
          transaction.reference_number ||
          "",

        partyName:
          transaction.party_name ||
          "",

        paymentMethod:
          transaction.payment_method ||
          "cash",
      });
    }


    setEditing(
      false
    );

    setError("");
    setMessage("");
  }


  /* ========================================
     FORMATTERS
  ======================================== */

  function formatCurrency(
    amount
  ) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",

        currency: "INR",

        maximumFractionDigits: 2,
      }
    ).format(
      Number(
        amount || 0
      )
    );
  }


  function formatDate(
    date
  ) {

    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    );
  }


  function formatPaymentMethod(
    method
  ) {

    if (!method) {
      return "Not provided";
    }


    return method
      .replaceAll(
        "_",
        " "
      )
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      );
  }


  /* ========================================
     LOADING
  ======================================== */

  if (
    authLoading ||
    loading
  ) {

    return (
      <div className="admin-loading">
        Loading transaction...
      </div>
    );
  }


  /* ========================================
     ERROR
  ======================================== */

  if (
    error &&
    !transaction
  ) {

    return (
      <div className="admin-form-page">

        <div className="form-message error">
          {error}
        </div>


        <Link
          to="/admin/reports"
          className="secondary-button"
        >
          ← Back to Transactions
        </Link>

      </div>
    );
  }


  if (
    !transaction
  ) {

    return (
      <div className="admin-form-page">

        <h1>
          Transaction not found.
        </h1>

      </div>
    );
  }


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="transaction-details-page">

      {/* ==================================
          HEADER
      ================================== */}

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            FINANCIAL RECORD
          </p>

          <h1>
            Transaction Details
          </h1>

        </div>


        <div className="transaction-detail-actions">

  {canEdit &&
    !editing && (

    <button
      type="button"
      className="primary-button"
      onClick={() => {

        setEditing(true);

        setError("");
        setMessage("");

      }}
    >
      Edit Transaction
    </button>

  )}


  {member?.role === "admin" &&
    !editing && (

    <button
      type="button"
      className="member-action danger"
      onClick={
        handleDelete
      }
    >
      Delete Transaction
    </button>

  )}


  {editing && (

    <button
      type="button"
      className="secondary-button"
      onClick={
        cancelEdit
      }
      disabled={
        saving
      }
    >
      Cancel
    </button>

  )}


  <Link
    to="/admin/reports"
    className="secondary-button"
  >
    ← Back
  </Link>

</div>

      </div>


      {/* ==================================
          MESSAGES
      ================================== */}

      {message && (

        <div className="form-message success">
          {message}
        </div>

      )}


      {error && (

        <div className="form-message error">
          {error}
        </div>

      )}


      {/* ==================================
          EDIT MODE
      ================================== */}

      {editing ? (

        <div className="transaction-edit-card">

          <div className="transaction-edit-header">

            <div>

              <span
                className={
                  transaction.type ===
                  "income"

                    ? "transaction-badge income-badge"

                    : "transaction-badge expense-badge"
                }
              >
                {transaction.type ===
                "income"
                  ? "Income"
                  : "Expense"}
              </span>


              <h2>
                Edit Transaction
              </h2>

            </div>


            <span className="transaction-id">
              ID: {transaction.id}
            </span>

          </div>


          <form
            onSubmit={
              handleSave
            }
          >

            <div className="transaction-edit-grid">

              {/* AMOUNT */}

              <div className="form-field">

                <label>
                  Amount
                </label>

                <div className="currency-input">

                  <span>
                    ₹
                  </span>

                  <input
                    type="number"
                    name="amount"
                    value={
                      form.amount
                    }
                    onChange={
                      handleChange
                    }
                    min="0.01"
                    step="0.01"
                    required
                  />

                </div>

              </div>


              {/* FUND */}

              <div className="form-field">

                <label>
                  Fund
                </label>

                <select
                  name="fundId"
                  value={
                    form.fundId
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Select fund
                  </option>

                  {funds.map(
                    (fund) => (

                      <option
                        key={
                          fund.id
                        }
                        value={
                          fund.id
                        }
                      >
                        {
                          fund.name
                        }
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* CATEGORY / EXPENSE PURPOSE */}

              {transaction.type ===
                "expense" ? (

                <div className="form-field">

                  <label>
                    What was this expense for?
                  </label>

                  <input
                    type="text"
                    name="expensePurpose"
                    value={
                      form.expensePurpose
                    }
                    onChange={
                      handleChange
                    }
                    list="expense-purpose-suggestions"
                    placeholder="e.g. Electricity bill, plumbing work, tiles..."
                    autoComplete="off"
                  />

                  <datalist
                    id="expense-purpose-suggestions"
                  >
                    {expenseSuggestions.map(
                      (suggestion) => (
                        <option
                          key={
                            suggestion
                          }
                          value={
                            suggestion
                          }
                        />
                      )
                    )}
                  </datalist>

                  <small className="file-help">
                    Type your own expense or choose a
                    previously used suggestion.
                  </small>

                </div>

              ) : (

                <div className="form-field">

                  <label>
                    Category
                  </label>

                  <input
                    type="text"
                    name="category"
                    value={
                      form.category
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>
              )}


              {/* DATE */}

              <div className="form-field">

                <label>
                  Date
                </label>

                <input
                  type="date"
                  name="transactionDate"
                  value={
                    form.transactionDate
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              {/* PARTY / DONOR */}

              {transaction.type ===
                "income" && (

                <div className="form-field">

                  <label>
                    Donor / Reference
                  </label>

                  <input
                    type="text"
                    name="partyName"
                    value={
                      form.partyName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Optional"
                  />

                </div>
              )}


              {/* PAYMENT METHOD */}

              <div className="form-field">

                <label>
                  Payment Method
                </label>

                <select
                  name="paymentMethod"
                  value={
                    form.paymentMethod
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="cash">
                    Cash
                  </option>

                  <option value="upi">
                    UPI
                  </option>

                  <option value="bank_transfer">
                    Bank Transfer
                  </option>

                  <option value="cheque">
                    Cheque
                  </option>

                  <option value="card">
                    Card
                  </option>

                  <option value="online_gateway">
                    Online Gateway
                  </option>

                  <option value="other">
                    Other
                  </option>

                </select>

              </div>


              {/* REFERENCE */}

              <div className="form-field">

                <label>
                  Reference Number
                </label>

                <input
                  type="text"
                  name="referenceNumber"
                  value={
                    form.referenceNumber
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Optional"
                />

              </div>


            </div>


            {/* DESCRIPTION */}

            <div className="form-field">

              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  form.description
                }
                onChange={
                  handleChange
                }
                rows="5"
                placeholder="Description"
              />

            </div>


            {/* RECEIPT */}

            <div className="transaction-edit-receipt">

              <div>

                <span>
                  Supporting Document
                </span>

                <p>
                  The existing receipt will
                  remain attached while editing.
                </p>

              </div>


              {receiptUrl ? (

                <a
                  href={
                    receiptUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="receipt-link"
                >
                  View receipt →
                </a>

              ) : (

                <span>
                  No receipt attached.
                </span>

              )}

            </div>


            {/* ACTIONS */}

            <div className="transaction-edit-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  cancelEdit
                }
                disabled={
                  saving
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="primary-button"
                disabled={
                  saving
                }
              >
                {
                  saving
                    ? "Saving..."
                    : "Save Changes"
                }
              </button>

            </div>

          </form>

        </div>

      ) : (

        /* ==================================
           VIEW MODE
        ================================== */

        <div className="transaction-detail-card">

          <div className="transaction-detail-header">

            <div>

              <span
                className={
                  transaction.type ===
                  "income"

                    ? "transaction-badge income-badge"

                    : "transaction-badge expense-badge"
                }
              >
                {transaction.type ===
                "income"
                  ? "Income"
                  : "Expense"}
              </span>


              <h2>
                {formatCurrency(
                  Number(
                    transaction.amount
                  )
                )}
              </h2>

            </div>


            <div className="transaction-id">
              ID: {transaction.id}
            </div>

          </div>


          <div className="transaction-detail-grid">

            {transaction.type ===
              "income" && (

              <div>

                <span>
                  Donor / Reference
                </span>

                <strong>
                  {
                    transaction.party_name ||
                    "Not provided"
                  }
                </strong>

              </div>
            )}


            {transaction.type ===
              "expense" &&
              transaction.party_name && (

              <div>

                <span>
                  Payee / Vendor
                </span>

                <strong>
                  {
                    transaction.party_name
                  }
                </strong>

              </div>
            )}


            <div>

              <span>
                Payment Method
              </span>

              <strong>
                {formatPaymentMethod(
                  transaction.payment_method
                )}
              </strong>

            </div>


            <div>

              <span>
                Fund
              </span>

              <strong>
                {
                  transaction.funds?.name ||
                  "Unknown Fund"
                }
              </strong>

            </div>


            <div>

              <span>
                {transaction.type ===
                "expense"
                  ? "What was this expense for?"
                  : "Category"}
              </span>

              <strong>
                {
                  transaction.category ||
                  "Not provided"
                }
              </strong>

            </div>


            <div>

              <span>
                Date
              </span>

              <strong>
                {formatDate(
                  transaction.transaction_date
                )}
              </strong>

            </div>


            <div>

              <span>
                Reference
              </span>

              <strong>
                {
                  transaction.reference_number ||
                  "Not provided"
                }
              </strong>

            </div>

          </div>


          <div className="transaction-description">

            <span>
              Description
            </span>

            <p>
              {
                transaction.description ||
                "No description provided."
              }
            </p>

          </div>


          <div className="transaction-receipt">

            <span>
              Supporting Document
            </span>


            {receiptUrl ? (

              <a
                href={
                  receiptUrl
                }
                target="_blank"
                rel="noreferrer"
                className="receipt-link"
              >
                View receipt →
              </a>

            ) : (

              <p>
                No receipt attached.
              </p>

            )}

          </div>

        </div>

      )}

    </div>
  );
}


export default TransactionDetails;