import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";


function Expenses() {

  const {
    user,
    loading: authLoading,
  } = useAuth();


  /* ========================================
     GENERAL
  ======================================== */

  const [funds, setFunds] =
    useState([]);

  const [loadingData, setLoadingData] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /* ========================================
     RECEIPT
  ======================================== */

  const [receiptFile, setReceiptFile] =
    useState(null);


  /* ========================================
     EXPENSE FORM
  ======================================== */

  const [form, setForm] =
    useState({
      fundId: "",
      expensePurpose: "",
      amount: "",
      description: "",
      transactionDate:
        new Date()
          .toISOString()
          .split("T")[0],
      referenceNumber: "",
      paymentMethod: "cash",
    });


  /* ========================================
     LOAD DATA
  ======================================== */

  async function loadData() {

    setLoadingData(true);
    setError("");
    setMessage("");


    const {
      data: loadedFunds,
      error: fundsError,
    } = await supabase
      .from("funds")
      .select(`
        id,
        name,
        fund_type,
        include_in_masjid_totals
      `)
      .eq(
        "is_active",
        true
      )
      .order(
        "name"
      );


    if (fundsError) {

      setError(
        fundsError.message
      );

      setLoadingData(false);

      return;
    }


    const fundsData =
      loadedFunds || [];


    setFunds(
      fundsData
    );


    setForm(
      (current) => ({
        ...current,

        fundId:
          current.fundId ||
          fundsData.find(
            (fund) =>
              fund.include_in_masjid_totals !== false
          )?.id ||
          "",

        expensePurpose:
          current.expensePurpose ||
          "",
      })
    );


    setLoadingData(false);
  }


  useEffect(() => {

    if (!authLoading) {
      loadData();
    }

  }, [
    authLoading,
  ]);


  /* ========================================
     FORM HANDLERS
  ======================================== */

  function handleChange(
    event
  ) {

    const {
      name,
      value,
    } = event.target;


    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }


  /* ========================================
     RECEIPT
  ======================================== */

  function handleReceiptChange(
    event
  ) {

    const file =
      event.target.files?.[0] ||
      null;


    setError("");
    setMessage("");


    if (!file) {

      setReceiptFile(
        null
      );

      return;
    }


    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];


    const maxSize =
      10 * 1024 * 1024;


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      setError(
        "Receipt must be a PDF, JPG, PNG, or WebP file."
      );

      event.target.value =
        "";

      setReceiptFile(
        null
      );

      return;
    }


    if (
      file.size >
      maxSize
    ) {

      setError(
        "Receipt file must be smaller than 10 MB."
      );

      event.target.value =
        "";

      setReceiptFile(
        null
      );

      return;
    }


    setReceiptFile(
      file
    );
  }


  /* ========================================
     RECORD EXPENSE
  ======================================== */

  async function handleSubmit(
    event
  ) {

    event.preventDefault();

    setMessage("");
    setError("");


    if (!user) {

      setError(
        "You must be signed in."
      );

      return;
    }


    const amount =
      Number(
        form.amount
      );


    if (!form.fundId) {

      setError(
        "Please select a fund."
      );

      return;
    }


    if (
      !form.expensePurpose.trim()
    ) {

      setError(
        "Please enter what this expense was for."
      );

      return;
    }


    if (
      !amount ||
      amount <= 0
    ) {

      setError(
        "Please enter a valid amount."
      );

      return;
    }


    setSaving(
      true
    );


    let transactionId =
      null;

    let uploadedReceiptPath =
      null;


    try {

      /* =============================
         STEP 1
         CREATE TRANSACTION
      ============================= */

      const {
        data: transaction,
        error: transactionError,
      } =
        await supabase
          .from("transactions")
          .insert({

            fund_id:
              form.fundId,

            type:
              "expense",

            amount,

            /*
             * We keep using the existing
             * transactions.category column,
             * but now it stores the user's
             * free-text expense purpose.
             */
            category:
              form.expensePurpose.trim(),

            description:
              form.description.trim() ||
              null,

            transaction_date:
              form.transactionDate,

            reference_number:
              form.referenceNumber.trim() ||
              null,

            created_by:
              user.id,

            payment_method:
              form.paymentMethod,

          })
          .select(
            "id"
          )
          .single();


      if (
        transactionError
      ) {

        throw transactionError;
      }


      transactionId =
        transaction.id;


      /* =============================
         STEP 2
         RECEIPT UPLOAD
      ============================= */

      if (receiptFile) {

        const fileExtension =
          receiptFile.name
            .split(".")
            .pop();


        const safeExtension =
          fileExtension
            ?.toLowerCase() ||
          "file";


        const filePath =
          `${user.id}/${transactionId}.${safeExtension}`;


        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              "receipts"
            )
            .upload(
              filePath,
              receiptFile,
              {
                upsert:
                  false,

                contentType:
                  receiptFile.type,
              }
            );


        if (
          uploadError
        ) {

          throw uploadError;
        }


        uploadedReceiptPath =
          filePath;


        /* =============================
           STEP 3
           LINK RECEIPT
        ============================= */

        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "transactions"
            )
            .update({
              receipt_url:
                filePath,
            })
            .eq(
              "id",
              transactionId
            );


        if (
          updateError
        ) {

          throw updateError;
        }
      }


      /* =============================
         SUCCESS
      ============================= */

      setMessage(
        receiptFile
          ? "Expense and receipt recorded successfully."
          : "Expense recorded successfully."
      );


      const defaultFund =
        funds.find(
          (fund) =>
            fund.include_in_masjid_totals !== false
        );


      setForm({
        fundId:
          defaultFund?.id ||
          "",

        expensePurpose:
          "",

        amount:
          "",

        description:
          "",

        transactionDate:
          new Date()
            .toISOString()
            .split("T")[0],

        referenceNumber:
          "",

        paymentMethod:
          "cash",
      });


      setReceiptFile(
        null
      );


      const fileInput =
        document.getElementById(
          "expense-receipt"
        );


      if (fileInput) {
        fileInput.value =
          "";
      }

    } catch (
      submitError
    ) {

      /*
       * Roll back the uploaded receipt
       * if the transaction later fails.
       */
      if (
        uploadedReceiptPath
      ) {

        await supabase.storage
          .from(
            "receipts"
          )
          .remove([
            uploadedReceiptPath,
          ]);
      }


      /*
       * Roll back the transaction
       * if anything after insertion fails.
       */
      if (
        transactionId
      ) {

        await supabase
          .from(
            "transactions"
          )
          .delete()
          .eq(
            "id",
            transactionId
          );
      }


      setError(
        submitError?.message ||
          "Unable to record the expense."
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  /* ========================================
     LOADING
  ======================================== */

  if (
    authLoading ||
    loadingData
  ) {

    return (
      <div className="admin-loading">
        Loading expense form...
      </div>
    );
  }


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="admin-form-page">

      {/* ==================================
          HEADER
      ================================== */}

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            FINANCIAL MANAGEMENT
          </p>

          <h1>
            Add Expense
          </h1>

          <p>
            Record a payment or Mahal expense.
          </p>

        </div>


        <button
          type="button"
          className="secondary-button"
          onClick={
            loadData
          }
          disabled={
            loadingData ||
            saving
          }
        >
          ↻ Refresh
        </button>

      </div>


      {/* ==================================
          MESSAGES
      ================================== */}

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


      {/* ==================================
          EXPENSE FORM
      ================================== */}

      <div className="admin-form-card">

        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="admin-form-grid">

            {/* EXPENSE PURPOSE */}

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
                placeholder="e.g. Electricity bill, tiles, plumbing work..."
                autoComplete="off"
                required
              />

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


                <optgroup label="Masjid Funds">

                  {funds
                    .filter(
                      (fund) =>
                        fund.include_in_masjid_totals !== false
                    )
                    .map(
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

                </optgroup>


                <optgroup label="Separate Funds">

                  {funds
                    .filter(
                      (fund) =>
                        fund.include_in_masjid_totals === false
                    )
                    .map(
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

                </optgroup>

              </select>

            </div>


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
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  required
                />

              </div>

            </div>


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

                <option value="other">
                  Other
                </option>

              </select>

            </div>


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


            {/* REFERENCE */}

            <div className="form-field">

              <label>
                Bill / Reference Number
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
                placeholder="Optional bill or reference number"
              />

            </div>

          </div>


          {/* ==================================
              DESCRIPTION
          ================================== */}

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
              rows="4"
              placeholder="Additional notes about this expense..."
            />

          </div>


          {/* ==================================
              RECEIPT
          ================================== */}

          <div className="form-field">

            <label>
              Receipt / Bill
            </label>

            <input
              id="expense-receipt"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={
                handleReceiptChange
              }
            />

            <p className="file-help">
              Optional. PDF, JPG, PNG or WebP
              up to 10 MB.
            </p>


            {receiptFile && (

              <p className="selected-file">

                Selected:{" "}

                <strong>
                  {
                    receiptFile.name
                  }
                </strong>

              </p>

            )}

          </div>


          {/* ==================================
              SUBMIT
          ================================== */}

          <div className="admin-form-actions">

            <button
              type="submit"
              className="expense-submit"
              disabled={
                saving
              }
            >
              {
                saving
                  ? "Saving..."
                  : "Record Expense"
              }
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


export default Expenses;