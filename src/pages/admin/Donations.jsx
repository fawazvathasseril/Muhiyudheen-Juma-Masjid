import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";


function Donations() {

  const {
    user,
    loading: authLoading,
  } = useAuth();


  /* ========================================
     DATA
  ======================================== */

  const [funds, setFunds] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [members, setMembers] =
    useState([]);

  const [externalContributors, setExternalContributors] =
    useState([]);


  /* ========================================
     GENERAL STATE
  ======================================== */

  const [loadingData, setLoadingData] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [memberSearch, setMemberSearch] =
    useState("");


  /* ========================================
     FORM
  ======================================== */

  const [form, setForm] =
    useState({

      contributorType:
        "member",

      memberId:
        "",

      externalContributorId:
        "",

      fundId:
        "",

      category:
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

      partyName:
        "",
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
      membersResult,
      externalResult,
    ] = await Promise.all([

      /* FUNDS */

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
        .order(
          "name"
        ),


      /* INCOME CATEGORIES */

      supabase
        .from("fund_categories")
        .select(`
          id,
          name,
          description,
          is_active,
          fund_id
        `)
        .eq(
          "is_active",
          true
        )
        .not(
          "fund_id",
          "is",
          null
        )
        .order(
          "name"
        ),


      /* MEMBERS */

      supabase
        .from("mahall_members")
        .select(`
          id,
          member_code,
          full_name,
          phone,
          household_name
        `)
        .eq(
          "status",
          "active"
        )
        .order(
          "member_code"
        ),


      /* EXTERNAL CONTRIBUTORS */

      supabase
        .from("external_contributors")
        .select(`
          id,
          contributor_code,
          full_name,
          organization
        `)
        .order(
          "contributor_code"
        ),
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


    if (membersResult.error) {

      setError(
        membersResult.error.message
      );

      setLoadingData(false);

      return;
    }


    if (externalResult.error) {

      setError(
        externalResult.error.message
      );

      setLoadingData(false);

      return;
    }


    const loadedFunds =
      fundsResult.data || [];


    const loadedCategories =
      categoriesResult.data || [];


    const loadedMembers =
      membersResult.data || [];


    const loadedExternal =
      externalResult.data || [];


    setFunds(
      loadedFunds
    );

    setCategories(
      loadedCategories
    );

    setMembers(
      loadedMembers
    );

    setExternalContributors(
      loadedExternal
    );


    setForm(
      (current) => {

        const defaultFund =
          current.fundId
            ? loadedFunds.find(
                (fund) =>
                  fund.id ===
                  current.fundId
              )
            : loadedFunds.find(
                (fund) =>
                  fund.include_in_masjid_totals !== false
              );


        return {
          ...current,

          fundId:
            defaultFund?.id ||
            "",

          category:
            current.category ||
            "",

          memberId:
            current.memberId ||
            loadedMembers[0]?.id ||
            "",
        };
      }
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
     FORM HANDLER
  ======================================== */

  function handleChange(
    event
  ) {

    const {
      name,
      value,
    } = event.target;


    setForm(
      (current) => {

        if (
          name ===
          "fundId"
        ) {

          return {
            ...current,

            fundId:
              value,

            category:
              "",
          };
        }


        return {
          ...current,

          [name]:
            value,
        };
      }
    );
  }


  /* ========================================
     CONTRIBUTOR TYPE
  ======================================== */

  function handleContributorTypeChange(
    event
  ) {

    const type =
      event.target.value;


    setForm(
      (current) => ({
        ...current,

        contributorType:
          type,

        memberId:
          type === "member"
            ? current.memberId
            : "",

        externalContributorId:
          type === "external"
            ? current.externalContributorId
            : "",

        partyName:
          "",
      })
    );
  }


  /* ========================================
     SELECTED MEMBER
  ======================================== */

  const selectedMember =
    useMemo(() => {

      return members.find(
        (member) =>
          member.id ===
          form.memberId
      );

    }, [
      members,
      form.memberId,
    ]);


  /* ========================================
     MEMBER SEARCH
  ======================================== */

  const filteredMembers =
    useMemo(() => {

      const query =
        memberSearch
          .trim()
          .toLowerCase();


      if (!query) {
        return members;
      }


      return members.filter(
        (member) =>
          member.member_code
            .toLowerCase()
            .includes(query) ||

          member.full_name
            .toLowerCase()
            .includes(query) ||

          (member.address || "")
            .toLowerCase()
            .includes(query) ||

          (member.household_name || "")
            .toLowerCase()
            .includes(query)
      );

    }, [
      members,
      memberSearch,
    ]);


  /* ========================================
     SELECTED EXTERNAL
  ======================================== */

  const selectedExternal =
    useMemo(() => {

      return externalContributors.find(
        (contributor) =>
          contributor.id ===
          form.externalContributorId
      );

    }, [
      externalContributors,
      form.externalContributorId,
    ]);


  /* ========================================
     SELECTED FUND
  ======================================== */

  const selectedFund =
    useMemo(() => {

      return funds.find(
        (fund) =>
          fund.id ===
          form.fundId
      );

    }, [
      funds,
      form.fundId,
    ]);


  /* ========================================
     CATEGORIES FOR SELECTED FUND
  ======================================== */

  const availableCategories =
    useMemo(() => {

      if (!form.fundId) {
        return [];
      }


      return categories.filter(
        (category) =>
          category.is_active &&
          category.fund_id ===
            form.fundId
      );

    }, [
      categories,
      form.fundId,
    ]);


  /* ========================================
     PARTY NAME
  ======================================== */

  useEffect(() => {

    if (
      form.contributorType ===
      "member"
    ) {

      setForm(
        (current) => ({
          ...current,

          partyName:
            selectedMember?.full_name ||
            "",
        })
      );
    }


    if (
      form.contributorType ===
      "external"
    ) {

      setForm(
        (current) => ({
          ...current,

          partyName:
            selectedExternal?.full_name ||
            selectedExternal?.organization ||
            "",
        })
      );
    }


    if (
      form.contributorType ===
      "anonymous"
    ) {

      setForm(
        (current) => ({
          ...current,

          partyName:
            "Anonymous",
        })
      );
    }

  }, [
    form.contributorType,
    selectedMember,
    selectedExternal,
  ]);


  /* ========================================
     SUBMIT
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
        "Please select an income category."
      );

      return;
    }


    const categoryBelongsToFund =
      availableCategories.some(
        (category) =>
          category.name ===
          form.category
      );


    if (
      !categoryBelongsToFund
    ) {

      setError(
        "The selected category does not belong to this fund."
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


    if (
      form.contributorType ===
        "member" &&
      !form.memberId
    ) {

      setError(
        "Please select a Mahall member."
      );

      return;
    }


    if (
      form.contributorType ===
        "external" &&
      !form.externalContributorId
    ) {

      setError(
        "Please select an external contributor."
      );

      return;
    }


    setSaving(
      true
    );


    const transactionData = {

      fund_id:
        form.fundId,

      type:
        "income",

      amount,

      category:
        form.category,

      description:
        form.description.trim() ||
        null,

      transaction_date:
        form.transactionDate,

      reference_number:
        form.referenceNumber.trim() ||
        null,

      payment_method:
        form.paymentMethod,

      party_name:
        form.partyName ||
        null,

      created_by:
        user.id,

      mahall_member_id:
        form.contributorType ===
        "member"
          ? form.memberId
          : null,

      external_contributor_id:
        form.contributorType ===
        "external"
          ? form.externalContributorId
          : null,
    };


    const {
      error: insertError,
    } =
      await supabase
        .from("transactions")
        .insert(
          transactionData
        );


    setSaving(
      false
    );


    if (insertError) {

      setError(
        insertError.message
      );

      return;
    }


    setMessage(
      "Contribution recorded successfully."
    );


    const defaultFund =
      funds.find(
        (fund) =>
          fund.include_in_masjid_totals !== false
      );


    setForm({

      contributorType:
        "member",

      memberId:
        members[0]?.id ||
        "",

      externalContributorId:
        "",

      fundId:
        defaultFund?.id ||
        "",

      category:
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

      partyName:
        members[0]?.full_name ||
        "",
    });


    setMemberSearch("");
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
        Loading contribution form...
      </div>
    );
  }


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="admin-form-page">

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            FINANCIAL MANAGEMENT
          </p>

          <h1>
            Record Contribution
          </h1>

          <p>
            Record a contribution and link it to the
            appropriate contributor.
          </p>

        </div>


        <button
          type="button"
          className="secondary-button"
          onClick={
            loadData
          }
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


      <div className="admin-form-card">

        <form
          onSubmit={
            handleSubmit
          }
        >

          {/* ==================================
              CONTRIBUTOR TYPE
          ================================== */}

          <div className="form-field">

            <label>
              Contributor Type
            </label>

            <select
              value={
                form.contributorType
              }
              onChange={
                handleContributorTypeChange
              }
            >

              <option value="member">
                Mahall Member
              </option>

              <option value="external">
                External Contributor
              </option>

              <option value="anonymous">
                Anonymous
              </option>

            </select>

          </div>


          {/* ==================================
              MAHALL MEMBER
          ================================== */}

          {form.contributorType ===
            "member" && (

            <div className="contributor-selector">

              <div className="form-field">

                <label>
                  Mahall Member ID
                </label>

                <input
                  type="search"
                  value={
                    memberSearch
                  }
                  onChange={(event) =>
                    setMemberSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search ID, name or address..."
                  autoComplete="off"
                />

              </div>


              <div className="member-search-results">

                {filteredMembers.length ===
                0 ? (

                  <div className="member-search-empty">
                    No members found.
                  </div>

                ) : (

                  filteredMembers
                    .slice(0, 8)
                    .map(
                      (member) => (

                        <button
                          type="button"
                          key={
                            member.id
                          }
                          className={
                            form.memberId ===
                            member.id
                              ? "member-search-result selected"
                              : "member-search-result"
                          }
                          onClick={() => {

                            setForm(
                              (current) => ({
                                ...current,

                                memberId:
                                  member.id,
                              })
                            );

                            setMemberSearch(
                              `${member.member_code} — ${member.full_name}`
                            );
                          }}
                        >

                          <strong>
                            {
                              member.member_code
                            }
                          </strong>

                          <span>
                            {
                              member.full_name
                            }
                          </span>

                          {member.address && (
                            <small>
                              📍{" "}
                              {
                                member.address
                              }
                            </small>
                          )}

                        </button>

                      )
                    )

                )}

              </div>


              {selectedMember && (
                <div className="selected-contributor-card">

                  <span>
                    MAHALL MEMBER
                  </span>

                  <strong>
                    {
                      selectedMember.member_code
                    }
                  </strong>

                  <strong>
                    {
                      selectedMember.full_name
                    }
                  </strong>

                  {selectedMember.household_name && (
                    <small>
                      Family:{" "}
                      {
                        selectedMember.household_name
                      }
                    </small>
                  )}

                  {selectedMember.address && (
                    <small>
                      📍{" "}
                      {
                        selectedMember.address
                      }
                    </small>
                  )}

                  {selectedMember.phone && (
                    <small>
                      ☎{" "}
                      {
                        selectedMember.phone
                      }
                    </small>
                  )}

                </div>
              )}

            </div>
          )}


          {/* ==================================
              EXTERNAL CONTRIBUTOR
          ================================== */}

          {form.contributorType ===
            "external" && (

            <div className="contributor-selector">

              <div className="form-field">

                <label>
                  External Contributor
                </label>

                <select
                  name="externalContributorId"
                  value={
                    form.externalContributorId
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Select contributor
                  </option>

                  {externalContributors.map(
                    (contributor) => (

                      <option
                        key={
                          contributor.id
                        }
                        value={
                          contributor.id
                        }
                      >

                        {
                          contributor.contributor_code
                        }

                        {" — "}

                        {
                          contributor.full_name ||
                          contributor.organization ||
                          "Unnamed contributor"
                        }

                      </option>

                    )
                  )}

                </select>

              </div>


              {selectedExternal && (

                <div className="selected-contributor-card">

                  <span>
                    EXTERNAL CONTRIBUTOR
                  </span>

                  <strong>
                    {
                      selectedExternal.full_name ||
                      selectedExternal.organization ||
                      "Unnamed"
                    }
                  </strong>

                </div>

              )}

            </div>
          )}


          {/* ==================================
              ANONYMOUS
          ================================== */}

          {form.contributorType ===
            "anonymous" && (

            <div className="selected-contributor-card">

              <span>
                CONTRIBUTOR
              </span>

              <strong>
                Anonymous
              </strong>

              <small>
                No personal contributor profile
                will be linked.
              </small>

            </div>
          )}


          {/* ==================================
              FINANCIAL DETAILS
          ================================== */}

          <div className="admin-form-grid">


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
                disabled={
                  !form.fundId
                }
              >

                <option value="">
                  {!form.fundId
                    ? "Select fund first"
                    : availableCategories.length === 0
                      ? "No categories added"
                      : "Select category"}
                </option>


                {availableCategories.map(
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


              {form.fundId &&
                availableCategories.length === 0 && (
                  <small className="file-help">
                    No categories have been added
                    to this fund yet. Add one from
                    Funds → Categories.
                  </small>
                )}

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


          {/* ==================================
              CONTRIBUTOR NAME
          ================================== */}

          <div className="form-field">

            <label>
              Contributor Name
            </label>

            <input
              type="text"
              value={
                form.partyName
              }
              readOnly
              placeholder="Automatically filled"
            />

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
              placeholder="Optional description"
            />

          </div>


          {/* ==================================
              SUBMIT
          ================================== */}

          <div className="admin-form-actions">

            <button
              type="submit"
              className="primary-button"
              disabled={
                saving ||
                !form.fundId ||
                availableCategories.length ===
                  0
              }
            >
              {
                saving
                  ? "Saving..."
                  : "Record Contribution"
              }
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


export default Donations;