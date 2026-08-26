import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";


function Expenses() {

  const {
    user,
    member,
    loading: authLoading,
  } = useAuth();


  const isAdmin =
    member?.role === "admin";


  /* ========================================
     GENERAL
  ======================================== */

  const [funds, setFunds] =
    useState([]);

  const [expenseCategories, setExpenseCategories] =
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
      amount: "",
      category: "",
      description: "",
      transactionDate:
        new Date()
          .toISOString()
          .split("T")[0],
      referenceNumber: "",
      paymentMethod: "cash",
      partyName: "",
    });


  /* ========================================
     CATEGORY MODAL
  ======================================== */

  const [showCategoryManager, setShowCategoryManager] =
    useState(false);

  const [showCategoryModal, setShowCategoryModal] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState(null);

  const [savingCategory, setSavingCategory] =
    useState(false);

  const [categoryForm, setCategoryForm] =
    useState({
      name: "",
      description: "",
      isActive: true,
    });


  /* ========================================
     LOAD DATA
  ======================================== */

  async function loadData() {

    setLoadingData(true);
    setError("");


    const [
      fundsResult,
      categoriesResult,
    ] =
      await Promise.all([

        supabase
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
  .order("name"),

        supabase
          .from("expense_categories")
          .select(`
            id,
            name,
            description,
            is_active,
            created_at
          `)
          .order("name"),
      ]);


    if (fundsResult.error) {

      setError(
        fundsResult.error.message
      );

      setLoadingData(false);

      return;
    }


    if (categoriesResult.error) {

      setError(
        categoriesResult.error.message
      );

      setLoadingData(false);

      return;
    }


    const loadedFunds =
      fundsResult.data || [];

    const loadedCategories =
      categoriesResult.data || [];


    setFunds(
      loadedFunds
    );

    setExpenseCategories(
      loadedCategories
    );


    const activeCategories =
      loadedCategories.filter(
        (category) =>
          category.is_active
      );


    setForm(
      (current) => ({
        ...current,

        fundId:
  current.fundId ||
  loadedFunds.find(
    (fund) =>
      fund.include_in_masjid_totals !== false
  )?.id ||
  "",

        category:
          current.category ||
          activeCategories[0]?.name ||
          "",
      })
    );


    setLoadingData(false);
  }


  useEffect(() => {

    if (!authLoading) {
      loadData();
    }

  }, [authLoading]);


  /* ========================================
     FORM HANDLERS
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


    if (!form.category) {

      setError(
        "Please select an expense category."
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

      /* -----------------------------
         STEP 1
      ----------------------------- */

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

            category:
              form.category,

            description:
              form.description ||
              null,

            transaction_date:
              form.transactionDate,

            reference_number:
              form.referenceNumber ||
              null,

            created_by:
              user.id,

            payment_method:
              form.paymentMethod,

            party_name:
              form.partyName.trim() ||
              null,
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


      /* -----------------------------
         STEP 2
         Receipt
      ----------------------------- */

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


        /* -----------------------------
           STEP 3
        ----------------------------- */

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


      /* -----------------------------
         SUCCESS
      ----------------------------- */

      setMessage(
        receiptFile
          ? "Expense and receipt recorded successfully."
          : "Expense recorded successfully."
      );


      const activeCategories =
        expenseCategories.filter(
          (category) =>
            category.is_active
        );


      setForm({
        fundId:
  funds.find(
    (fund) =>
      fund.include_in_masjid_totals !== false
  )?.id ||
  "",

        amount:
          "",

        category:
          activeCategories[0]?.name ||
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

        partyName:
          "",
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
     CATEGORY MANAGEMENT
  ======================================== */

  function openNewCategory() {

    setEditingCategory(
      null
    );

    setCategoryForm({
      name: "",
      description: "",
      isActive: true,
    });

    setError("");
    setMessage("");

    setShowCategoryModal(
      true
    );
  }


  function openEditCategory(
    category
  ) {

    setEditingCategory(
      category
    );

    setCategoryForm({
      name:
        category.name ||
        "",

      description:
        category.description ||
        "",

      isActive:
        category.is_active,
    });

    setError("");
    setMessage("");

    setShowCategoryModal(
      true
    );
  }


  async function saveCategory(
    event
  ) {

    event.preventDefault();


    if (!isAdmin) {

      setError(
        "Only admins can manage expense categories."
      );

      return;
    }


    const newName =
      categoryForm.name.trim();


    if (!newName) {

      setError(
        "Category name is required."
      );

      return;
    }


    setSavingCategory(
      true
    );

    setError("");
    setMessage("");


    try {

      /* =============================
         EDIT EXISTING CATEGORY
      ============================= */

      if (
        editingCategory
      ) {

        const oldName =
          editingCategory.name;


        /* -----------------------------
           Rename category in
           existing transactions too.
           This keeps historical reports
           consistent with the new name.
        ----------------------------- */

        if (
          oldName !==
          newName
        ) {

          const {
            error:
              transactionUpdateError,
          } =
            await supabase
              .from(
                "transactions"
              )
              .update({
                category:
                  newName,
              })
              .eq(
                "type",
                "expense"
              )
              .eq(
                "category",
                oldName
              );


          if (
            transactionUpdateError
          ) {
            throw transactionUpdateError;
          }
        }


        const {
          error:
            categoryUpdateError,
        } =
          await supabase
            .from(
              "expense_categories"
            )
            .update({
              name:
                newName,

              description:
                categoryForm.description.trim() ||
                null,

              is_active:
                categoryForm.isActive,
            })
            .eq(
              "id",
              editingCategory.id
            );


        if (
          categoryUpdateError
        ) {
          throw categoryUpdateError;
        }


        setMessage(
          "Expense category updated successfully."
        );

      } else {

        /* =============================
           CREATE CATEGORY
        ============================= */

        const {
          error:
            categoryInsertError,
        } =
          await supabase
            .from(
              "expense_categories"
            )
            .insert({
              name:
                newName,

              description:
                categoryForm.description.trim() ||
                null,

              is_active:
                categoryForm.isActive,

              created_by:
                user.id,
            });


        if (
          categoryInsertError
        ) {
          throw categoryInsertError;
        }


        setMessage(
          "Expense category created successfully."
        );
      }


      setShowCategoryModal(
        false
      );


      await loadData();

    } catch (
      categoryError
    ) {

      setError(
        categoryError?.message ||
          "Unable to save the expense category."
      );

    } finally {

      setSavingCategory(
        false
      );
    }
  }


  async function deleteCategory(
    category
  ) {

    if (!isAdmin) {
      return;
    }


    /* -----------------------------
       Check historical usage
    ----------------------------- */

    const {
      count,
      error:
        usageError,
    } =
      await supabase
        .from(
          "transactions"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "type",
          "expense"
        )
        .eq(
          "category",
          category.name
        );


    if (
      usageError
    ) {

      setError(
        usageError.message
      );

      return;
    }


    if (
      (count || 0) > 0
    ) {

      setError(
        `"${category.name}" cannot be deleted because ${count} expense transaction${count === 1 ? "" : "s"} use this category. Deactivate it instead to preserve financial history.`
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Permanently delete "${category.name}"? This cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    setError("");
    setMessage("");


    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "expense_categories"
        )
        .delete()
        .eq(
          "id",
          category.id
        );


    if (
      deleteError
    ) {

      setError(
        deleteError.message
      );

      return;
    }


    await loadData();


    setMessage(
      `"${category.name}" was permanently deleted.`
    );
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


        <div className="expense-header-actions">

          {isAdmin && (

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setShowCategoryManager(
                  (current) =>
                    !current
                )
              }
            >
              {showCategoryManager
                ? "Close Categories"
                : "Expense Categories"}
            </button>

          )}

        </div>

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
          CATEGORY MANAGEMENT
      ================================== */}

      {isAdmin &&
        showCategoryManager && (

        <section className="expense-category-manager">

          <div className="expense-category-manager-header">

            <div>

              <p className="section-label">
                EXPENSE STRUCTURE
              </p>

              <h2>
                Expense Categories
              </h2>

              <p>
                Categories organize expense
                transactions for reports and
                accounting.
              </p>

            </div>


            <button
              type="button"
              className="primary-button"
              onClick={
                openNewCategory
              }
            >
              + Add Category
            </button>

          </div>


          <div className="expense-category-grid">

            {expenseCategories.map(
              (category) => (

                <article
                  key={
                    category.id
                  }
                  className={
                    category.is_active
                      ? "expense-category-card"
                      : "expense-category-card inactive"
                  }
                >

                  <div className="expense-category-top">

                    <div className="expense-category-icon">
                      ₹
                    </div>


                    <span
                      className={
                        category.is_active
                          ? "expense-category-status active"
                          : "expense-category-status inactive"
                      }
                    >
                      {
                        category.is_active
                          ? "ACTIVE"
                          : "INACTIVE"
                      }
                    </span>

                  </div>


                  <h3>
                    {
                      category.name
                    }
                  </h3>


                  <p>
                    {
                      category.description ||
                      "No description provided."
                    }
                  </p>


                  <div className="expense-category-actions">

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        openEditCategory(
                          category
                        )
                      }
                    >
                      Edit
                    </button>


                    <button
                      type="button"
                      className="member-action danger"
                      onClick={() =>
                        deleteCategory(
                          category
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </article>

              )
            )}

          </div>

        </section>
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

            {/* PAYEE */}

            <div className="form-field">

              <label>
                Payee / Vendor
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


            {/* FUND */}

            <div className="form-field">

  <label>
    Fund
  </label>

  <select
    name="fundId"
    value={form.fundId}
    onChange={handleChange}
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
              key={fund.id}
              value={fund.id}
            >
              {fund.name}
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
              key={fund.id}
              value={fund.id}
            >
              {fund.name}
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


            {/* CATEGORY */}

            <div className="form-field">

              <label>
                Category
              </label>

              <select
                name="category"
                value={
                  form.category
                }
                onChange={
                  handleChange
                }
                required
              >

                <option value="">
                  Select category
                </option>

                {expenseCategories
                  .filter(
                    (category) =>
                      category.is_active
                  )
                  .map(
                    (category) => (

                      <option
                        key={
                          category.id
                        }
                        value={
                          category.name
                        }
                      >
                        {
                          category.name
                        }
                      </option>

                    )
                  )}

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
              rows="4"
              placeholder="What was this expense for?"
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


          {/* RECEIPT */}

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


          {/* SUBMIT */}

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


      {/* ==================================
          CATEGORY MODAL
      ================================== */}

      {showCategoryModal && (

        <div className="expense-category-modal-overlay">

          <div className="expense-category-modal">

            <button
              type="button"
              className="expense-category-modal-close"
              onClick={() =>
                setShowCategoryModal(
                  false
                )
              }
              disabled={
                savingCategory
              }
            >
              ×
            </button>


            <p className="section-label">
              EXPENSE STRUCTURE
            </p>


            <h2>
              {
                editingCategory
                  ? "Edit Expense Category"
                  : "Add Expense Category"
              }
            </h2>


            <p className="expense-category-modal-intro">
              Expense categories organize
              transactions for accounting and
              reporting.
            </p>


            <form
              onSubmit={
                saveCategory
              }
            >

              <div className="form-field">

                <label>
                  Category Name
                </label>

                <input
                  type="text"
                  value={
                    categoryForm.name
                  }
                  onChange={(event) =>
                    setCategoryForm(
                      (current) => ({
                        ...current,
                        name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. Electricity"
                  required
                />

              </div>


              <div className="form-field">

                <label>
                  Description
                </label>

                <textarea
                  rows="4"
                  value={
                    categoryForm.description
                  }
                  onChange={(event) =>
                    setCategoryForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Describe this category..."
                />

              </div>


              <div className="expense-category-status-box">

                <div>

                  <strong>
                    Category Status
                  </strong>

                  <p>
                    Inactive categories will no
                    longer appear when recording
                    new expenses.
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
                    setCategoryForm(
                      (current) => ({
                        ...current,
                        isActive:
                          !current.isActive,
                      })
                    )
                  }
                >

                  <span />

                  {
                    categoryForm.isActive
                      ? "Active"
                      : "Inactive"
                  }

                </button>

              </div>


              <div className="fund-modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowCategoryModal(
                      false
                    )
                  }
                  disabled={
                    savingCategory
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    savingCategory
                  }
                >
                  {
                    savingCategory
                      ? "Saving..."
                      : editingCategory
                        ? "Save Changes"
                        : "Create Category"
                  }
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}


export default Expenses;