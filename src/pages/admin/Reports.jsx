import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";


function Reports() {

    const {
    user,
    member,
  } = useAuth();

  const canImportTransactions =
    member?.role === "admin" ||
    member?.role === "treasurer";
  /* ========================================
     GENERAL STATE
  ======================================== */
const navigate = useNavigate();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] =
    useState(
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`
    );
    const [selectedYear, setSelectedYear] =
  useState(
    String(now.getFullYear())
  );


  /* ========================================
     TRANSACTION FILTERS
  ======================================== */

  const [
    transactionTypeFilter,
    setTransactionTypeFilter,
  ] = useState("all");


  const [
    transactionFromDate,
    setTransactionFromDate,
  ] = useState("");


  const [
    transactionToDate,
    setTransactionToDate,
  ] = useState("");


  /* ========================================
     DATA
  ======================================== */

  const [transactions, setTransactions] =
    useState([]);

  const [funds, setFunds] =
    useState([]);


  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");
const [showTransactionImport, setShowTransactionImport] =
  useState(false);

const [importFile, setImportFile] =
  useState(null);

const [importRows, setImportRows] =
  useState([]);

const [importErrors, setImportErrors] =
  useState([]);

const [importing, setImporting] =
  useState(false);

const [importResult, setImportResult] =
  useState(null);

  /* ========================================
   HISTORICAL TRANSACTION IMPORT
======================================== */

function parseCSVLine(line) {

  const result = [];

  let current = "";

  let insideQuotes =
    false;


  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const char =
      line[i];


    if (
      char === '"'
    ) {

      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      } else {

        insideQuotes =
          !insideQuotes;
      }

      continue;
    }


    if (
      char === "," &&
      !insideQuotes
    ) {

      result.push(
        current.trim()
      );

      current = "";

      continue;
    }


    current += char;
  }


  result.push(
    current.trim()
  );


  return result;
}


function normalizeHeader(
  value
) {

  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      "_"
    );
}


function parseImportDate(
  value
) {

  const raw =
    String(
      value || ""
    ).trim();


  if (!raw) {
    return null;
  }


  /* YYYY-MM-DD */

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      raw
    )
  ) {

    const date =
      new Date(
        `${raw}T00:00:00`
      );


    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      return raw;
    }
  }


  /* DD/MM/YYYY */

  let match =
    raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );


  if (!match) {

    match =
      raw.match(
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/
      );
  }


  if (match) {

    const day =
      match[1].padStart(
        2,
        "0"
      );

    const month =
      match[2].padStart(
        2,
        "0"
      );

    const year =
      match[3];


    const formatted =
      `${year}-${month}-${day}`;


    const date =
      new Date(
        `${formatted}T00:00:00`
      );


    if (
      !Number.isNaN(
        date.getTime()
      ) &&
      date.getFullYear() ===
        Number(year) &&
      date.getMonth() + 1 ===
        Number(month) &&
      date.getDate() ===
        Number(day)
    ) {

      return formatted;
    }
  }


  return null;
}


function normalizeTransactionType(
  value
) {

  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();


  if (
    normalized ===
      "income" ||
    normalized ===
      "donation" ||
    normalized ===
      "donations"
  ) {

    return "income";
  }


  if (
    normalized ===
      "expense" ||
    normalized ===
      "expenses"
  ) {

    return "expense";
  }


  return null;
}


function normalizePaymentMethod(
  value
) {

  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        "_"
      );


  if (!normalized) {
    return "cash";
  }


  const allowed = [
    "cash",
    "upi",
    "bank_transfer",
    "cheque",
    "card",
    "online_gateway",
    "other",
  ];


  return allowed.includes(
    normalized
  )
    ? normalized
    : null;
}


function normalizeCategory(
  type,
  value,
  expenseCategoryMap
) {

  const raw =
    String(
      value || ""
    ).trim();


  if (!raw) {
    return null;
  }


  if (
    type ===
    "expense"
  ) {

    const key =
      raw.toLowerCase();


    return (
      expenseCategoryMap.get(
        key
      ) || null
    );
  }


  const donationCategories = {
    donation:
      "donation",

    "general donation":
      "donation",

    friday_collection:
      "friday_collection",

    "friday collection":
      "friday_collection",

    zakat:
      "zakat",

    sadaqah:
      "sadaqah",

    "other income":
      "other_income",

    other_income:
      "other_income",
  };


  return (
    donationCategories[
      raw.toLowerCase()
    ] || null
  );
}


function readCSV(
  text
) {

  const lines =
    text
      .replace(
        /^\uFEFF/,
        ""
      )
      .split(
        /\r?\n/
      )
      .filter(
        (line) =>
          line.trim() !== ""
      );


  if (
    lines.length < 2
  ) {

    throw new Error(
      "The CSV must contain a header row and at least one transaction."
    );
  }


  const headers =
    parseCSVLine(
      lines[0]
    ).map(
      normalizeHeader
    );


  const required = [
    "date",
    "type",
    "amount",
    "fund",
    "category",
  ];


  const missing =
    required.filter(
      (header) =>
        !headers.includes(
          header
        )
    );


  if (
    missing.length
  ) {

    throw new Error(
      `Missing required column${
        missing.length > 1
          ? "s"
          : ""
      }: ${missing.join(
        ", "
      )}`
    );
  }


  return lines
    .slice(1)
    .map(
      (
        line,
        index
      ) => {

        const values =
          parseCSVLine(
            line
          );


        const raw =
          {};


        headers.forEach(
          (
            header,
            headerIndex
          ) => {

            raw[
              header
            ] =
              values[
                headerIndex
              ] ||
              "";
          }
        );


        return {
          rowNumber:
            index + 2,

          date:
            raw.date,

          type:
            raw.type,

          amount:
            raw.amount,

          fund:
            raw.fund,

          category:
            raw.category,

          partyName:
            raw.party_name ||
            raw.party ||
            "",

          paymentMethod:
            raw.payment_method ||
            "",

          referenceNumber:
            raw.reference ||
            raw.reference_number ||
            "",

          description:
            raw.description ||
            "",

          memberCode:
            raw.member_code ||
            "",

          externalContributorCode:
            raw.external_contributor_code ||
            "",
        };
      }
    );
}


async function prepareImportFile(
  event
) {

  setError("");
  setImportErrors([]);
  setImportResult(null);


  const file =
    event.target.files?.[0];


  if (!file) {
    return;
  }


  if (
    !file.name
      .toLowerCase()
      .endsWith(".csv")
  ) {

    setError(
      "Please choose a CSV file."
    );

    event.target.value =
      "";

    return;
  }


  try {

    const text =
      await file.text();


    const rows =
      readCSV(
        text
      );


    setImportFile(
      file
    );

    setImportRows(
      rows
    );

  } catch (
    importError
  ) {

    setImportFile(
      null
    );

    setImportRows([]);

    setError(
      importError.message
    );

    event.target.value =
      "";
  }
}


function downloadTransactionTemplate() {

  const csv = [
    "date,type,amount,fund,category,party_name,payment_method,reference,description,member_code,external_contributor_code",

    "15/03/2024,income,5000,General Fund,donation,Ahmed Ali,cash,,Friday donation,MH-0001,",

    "18/03/2024,expense,1200,General Fund,Electricity,Kerala Electricity,bank_transfer,ELEC-124,March electricity bill,,",
  ].join(
    "\n"
  );


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const anchor =
    document.createElement(
      "a"
    );


  anchor.href =
    url;

  anchor.download =
    "historical-transactions-template.csv";


  document.body.appendChild(
    anchor
  );

  anchor.click();

  document.body.removeChild(
    anchor
  );


  URL.revokeObjectURL(
    url
  );
}


async function validateImportRows() {

  const [
    fundsResult,
    expenseCategoriesResult,
    membersResult,
    externalResult,
    transactionsResult,
  ] =
    await Promise.all([

      supabase
        .from("funds")
        .select(
          "id, name"
        ),

      supabase
        .from(
          "expense_categories"
        )
        .select(
          "id, name, is_active"
        ),

      supabase
        .from(
          "mahall_members"
        )
        .select(
          "id, member_code"
        ),

      supabase
        .from(
          "external_contributors"
        )
        .select(
          "id, contributor_code"
        ),

      supabase
        .from("transactions")
        .select(`
          id,
          type,
          amount,
          fund_id,
          category,
          transaction_date,
          party_name,
          reference_number
        `),
    ]);


  const resultErrors = [];


  if (
    fundsResult.error
  ) {
    throw fundsResult.error;
  }


  if (
    expenseCategoriesResult.error
  ) {
    throw expenseCategoriesResult.error;
  }


  if (
    membersResult.error
  ) {
    throw membersResult.error;
  }


  if (
    externalResult.error
  ) {
    throw externalResult.error;
  }


  if (
    transactionsResult.error
  ) {
    throw transactionsResult.error;
  }


  const fundsByName =
    new Map();


  (
    fundsResult.data ||
    []
  ).forEach(
    (fund) => {

      fundsByName.set(
        fund.name
          .trim()
          .toLowerCase(),
        fund
      );
    }
  );


  const expenseCategoryMap =
    new Map();


  (
    expenseCategoriesResult.data ||
    []
  ).forEach(
    (category) => {

      if (
        category.is_active
      ) {

        expenseCategoryMap.set(
          category.name
            .trim()
            .toLowerCase(),
          category.name
        );
      }
    }
  );


  const membersByCode =
    new Map();


  (
    membersResult.data ||
    []
  ).forEach(
    (item) => {

      membersByCode.set(
        item.member_code
          .trim()
          .toLowerCase(),
        item
      );
    }
  );


  const externalByCode =
    new Map();


  (
    externalResult.data ||
    []
  ).forEach(
    (item) => {

      externalByCode.set(
        item.contributor_code
          .trim()
          .toLowerCase(),
        item
      );
    }
  );


  const existingSignatures =
    new Set();


  (
    transactionsResult.data ||
    []
  ).forEach(
    (transaction) => {

      existingSignatures.add(
        [
          transaction.transaction_date,
          transaction.type,
          Number(
            transaction.amount
          ),
          transaction.fund_id,
          transaction.category,
          (
            transaction.party_name ||
            ""
          ).trim().toLowerCase(),
          (
            transaction.reference_number ||
            ""
          ).trim().toLowerCase(),
        ].join("|")
      );

    }
  );


  const validRows =
    [];


  importRows.forEach(
    (row) => {

      const errors = [];


      const date =
        parseImportDate(
          row.date
        );


      if (!date) {

        errors.push(
          "Invalid date."
        );
      }


      const type =
        normalizeTransactionType(
          row.type
        );


      if (!type) {

        errors.push(
          "Type must be income/donation or expense."
        );
      }


      const amount =
        Number(
          String(
            row.amount
          )
            .replace(
              /₹/g,
              ""
            )
            .replace(
              /,/g,
              ""
            )
            .trim()
        );


      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {

        errors.push(
          "Amount must be greater than zero."
        );
      }


      const fund =
        fundsByName.get(
          String(
            row.fund ||
              ""
          )
            .trim()
            .toLowerCase()
        );


      if (!fund) {

        errors.push(
          `Fund "${row.fund}" was not found.`
        );
      }


      const category =
        type
          ? normalizeCategory(
              type,
              row.category,
              expenseCategoryMap
            )
          : null;


      if (!category) {

        errors.push(
          type ===
            "expense"

            ? `Expense category "${row.category}" was not found or is inactive.`

            : `Donation category "${row.category}" is not valid.`
        );
      }


      const paymentMethod =
        normalizePaymentMethod(
          row.paymentMethod
        );


      if (
        row.paymentMethod &&
        !paymentMethod
      ) {

        errors.push(
          `Payment method "${row.paymentMethod}" is not supported.`
        );
      }


      let memberId =
        null;


      if (
        row.memberCode
      ) {

        const member =
          membersByCode.get(
            row.memberCode
              .trim()
              .toLowerCase()
          );


        if (!member) {

          errors.push(
            `Mahall member "${row.memberCode}" was not found.`
          );

        } else {

          memberId =
            member.id;
        }
      }


      let externalContributorId =
        null;


      if (
        row.externalContributorCode
      ) {

        const contributor =
          externalByCode.get(
            row.externalContributorCode
              .trim()
              .toLowerCase()
          );


        if (!contributor) {

          errors.push(
            `External contributor "${row.externalContributorCode}" was not found.`
          );

        } else {

          externalContributorId =
            contributor.id;
        }
      }


      const signature =
        fund &&
        category &&
        date &&
        type
          ? [
              date,
              type,
              amount,
              fund.id,
              category,
              (
                row.partyName ||
                ""
              )
                .trim()
                .toLowerCase(),
              (
                row.referenceNumber ||
                ""
              )
                .trim()
                .toLowerCase(),
            ].join("|")
          : null;


      if (
        signature &&
        existingSignatures.has(
          signature
        )
      ) {

        errors.push(
          "This transaction already appears to exist."
        );
      }


      if (
        signature &&
        validRows.some(
          (item) =>
            item.signature ===
            signature
        )
      ) {

        errors.push(
          "Duplicate transaction inside this CSV."
        );
      }


      if (
        errors.length
      ) {

        resultErrors.push({
          rowNumber:
            row.rowNumber,

          errors,
        });

        return;
      }


      validRows.push({
        original:
          row,

        rowNumber:
          row.rowNumber,

        transaction: {
          fund_id:
            fund.id,

          type,

          amount,

          category,

          description:
            row.description.trim() ||
            null,

          transaction_date:
            date,

          reference_number:
            row.referenceNumber.trim() ||
            null,

          payment_method:
            paymentMethod ||
            "cash",

          party_name:
            row.partyName.trim() ||
            null,

          created_by:
            user.id,

          mahall_member_id:
            memberId,

          external_contributor_id:
            externalContributorId,
        },

        signature,
      });

    }
  );


  return {
    validRows,
    errors:
      resultErrors,
  };
}


async function runTransactionImport() {

  if (
    !canImportTransactions
  ) {

    setError(
      "Only administrators and treasurers can import transactions."
    );

    return;
  }


  setImporting(true);
  setError("");
  setImportErrors([]);
  setImportResult(null);


  try {

    const {
      validRows,
      errors,
    } =
      await validateImportRows();


    if (
      errors.length
    ) {

      setImportErrors(
        errors
      );

      setImporting(
        false
      );

      return;
    }


    let imported =
      0;


    const failed =
      [];


    for (
      const item of validRows
    ) {

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "transactions"
          )
          .insert(
            item.transaction
          );


      if (
        insertError
      ) {

        failed.push({
          rowNumber:
            item.rowNumber,

          errors: [
            insertError.message,
          ],
        });

      } else {

        imported++;
      }
    }


    setImportResult({
      imported,

      failed:
        failed.length,
    });


    setImportErrors(
      failed
    );


    if (
      imported > 0
    ) {

      setMessage(
        `${imported} historical transaction${
          imported === 1
            ? ""
            : "s"
        } imported successfully.`
      );


      await loadReportData();
    }


  } catch (
    importError
  ) {

    setError(
      importError?.message ||
        "Unable to import historical transactions."
    );

  } finally {

    setImporting(
      false
    );
  }
}
  /* ========================================
     LOAD REPORT DATA
  ======================================== */

  async function loadReportData() {

    setLoading(true);
    setError("");


    const [
      fundsResult,
      transactionsResult,
    ] = await Promise.all([

      /* FUNDS */

      supabase
  .from("funds")
  .select(`
    id,
    name,
    description,
    is_active,
    fund_type,
    include_in_masjid_totals
  `)
  .order("name"),

  

      /* TRANSACTIONS */

      supabase
        .from("transactions")
        .select(`
          id,
          fund_id,
          type,
          amount,
          category,
          description,
          transaction_date,
          reference_number,
          party_name,
          payment_method,
          created_at,
          funds (
            id,
            name
          )
        `)

        /* Latest first */

        .order(
          "transaction_date",
          {
            ascending: false,
          }
        )

        .order(
          "created_at",
          {
            ascending: false,
          }
        ),
    ]);


    if (fundsResult.error) {

      setError(
        fundsResult.error.message
      );

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


    setFunds(
      fundsResult.data || []
    );


    setTransactions(
      transactionsResult.data || []
    );


    setLoading(false);
  }


  useEffect(() => {

    loadReportData();

  }, []);


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

        maximumFractionDigits: 0,
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
        day: "2-digit",

        month: "short",

        year: "numeric",
      }
    );
  }


  function formatMonthLabel(
    value
  ) {

    const [
      year,
      month,
    ] = value.split("-");


    const date = new Date(
      Number(year),
      Number(month) - 1,
      1
    );


    return date.toLocaleDateString(
      "en-IN",
      {
        month: "long",

        year: "numeric",
      }
    );
  }


  /* ========================================
     MONTH BOUNDARIES
  ======================================== */

  const period = useMemo(() => {

    const [
      year,
      month,
    ] =
      selectedMonth
        .split("-")
        .map(Number);


    const start =
      new Date(
        year,
        month - 1,
        1
      );


    const end =
      new Date(
        year,
        month,
        0
      );


    const previousEnd =
      new Date(
        year,
        month - 1,
        0
      );


    function toDateString(
      date
    ) {

      return date
        .toISOString()
        .split("T")[0];
    }


    return {
      start:
        toDateString(
          start
        ),

      end:
        toDateString(
          end
        ),

      previousEnd:
        toDateString(
          previousEnd
        ),
    };

  }, [
    selectedMonth,
  ]);


  /* ========================================
     SELECTED MONTH TRANSACTIONS
  ======================================== */

  const monthlyTransactions =
    useMemo(() => {

      return transactions.filter(
        (transaction) =>
          transaction.transaction_date >=
            period.start &&
          transaction.transaction_date <=
            period.end
      );

    }, [
      transactions,
      period,
    ]);


  /* ========================================
     FILTERED TRANSACTIONS
  ======================================== */

  const filteredTransactions =
    useMemo(() => {

      return monthlyTransactions.filter(
        (transaction) => {

          /* -----------------------------
             TRANSACTION TYPE
          ----------------------------- */

          if (
            transactionTypeFilter !==
              "all" &&
            transaction.type !==
              transactionTypeFilter
          ) {

            return false;
          }


          /* -----------------------------
             FROM DATE
          ----------------------------- */

          if (
            transactionFromDate &&
            transaction.transaction_date <
              transactionFromDate
          ) {

            return false;
          }


          /* -----------------------------
             TO DATE
          ----------------------------- */

          if (
            transactionToDate &&
            transaction.transaction_date >
              transactionToDate
          ) {

            return false;
          }


          return true;
        }
      );

    }, [
      monthlyTransactions,
      transactionTypeFilter,
      transactionFromDate,
      transactionToDate,
    ]);


  /* ========================================
     OPENING BALANCE
  ======================================== */

  const openingBalance =
  useMemo(() => {

    return transactions
      .filter(
        (transaction) =>
          transaction.transaction_date <
            period.start &&
          funds.find(
            (fund) =>
              fund.id ===
              transaction.fund_id
          )?.include_in_masjid_totals !== false
      )
      .reduce(
        (
          total,
          transaction
        ) => {

          const amount =
            Number(
              transaction.amount
            );

          return transaction.type ===
            "income"
            ? total + amount
            : total - amount;

        },
        0
      );

  }, [
    transactions,
    funds,
    period,
  ]);

  /* ========================================
     TOTAL INCOME
  ======================================== */

  const totalIncome =
  useMemo(() => {

    return monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type ===
          "income"
      )
      .reduce(
        (
          total,
          transaction
        ) =>
          total +
          Number(
            transaction.amount
          ),
        0
      );

  }, [
    monthlyTransactions,
  ]);

  /* ========================================
     TOTAL EXPENSES
  ======================================== */

  const totalExpenses =
  useMemo(() => {

    return monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type ===
            "expense" &&
          funds.find(
            (fund) =>
              fund.id ===
              transaction.fund_id
          )?.include_in_masjid_totals !== false
      )
      .reduce(
        (
          total,
          transaction
        ) =>
          total +
          Number(
            transaction.amount
          ),
        0
      );

  }, [
    monthlyTransactions,
    funds,
  ]);

  /* ========================================
   CLOSING BALANCE
======================================== */

const closingBalance =
  openingBalance +
  totalIncome -
  totalExpenses;
/* ========================================
   YEARLY MONTHLY BALANCE REGISTER
======================================== */

const monthlyBalanceRegister =
  useMemo(() => {

    const year =
      Number(selectedYear);

    const rows = [];


    for (
      let month = 1;
      month <= 12;
      month++
    ) {

      const monthStart =
        new Date(
          year,
          month - 1,
          1
        );

      const monthEnd =
        new Date(
          year,
          month,
          0
        );


      const startString =
        monthStart
          .toISOString()
          .split("T")[0];

      const endString =
        monthEnd
          .toISOString()
          .split("T")[0];


      const beforeMonth =
  transactions.filter(
    (transaction) =>
      transaction.transaction_date <
        startString &&
      funds.find(
        (fund) =>
          fund.id ===
          transaction.fund_id
      )?.include_in_masjid_totals !== false
  );

      /*
       * Opening balance is the complete
       * financial balance before this month.
       */

      const opening =
        beforeMonth.reduce(
          (
            total,
            transaction
          ) => {

            const amount =
              Number(
                transaction.amount
              );


            return transaction.type ===
              "income"
              ? total + amount
              : total - amount;

          },
          0
        );


      const monthTransactions =
  transactions.filter(
    (transaction) =>
      transaction.transaction_date >=
        startString &&
      transaction.transaction_date <=
        endString &&
      funds.find(
        (fund) =>
          fund.id ===
          transaction.fund_id
      )?.include_in_masjid_totals !== false
  );


      const income =
        monthTransactions
          .filter(
            (transaction) =>
              transaction.type ===
              "income"
          )
          .reduce(
            (
              total,
              transaction
            ) =>
              total +
              Number(
                transaction.amount
              ),
            0
          );


      const expenses =
        monthTransactions
          .filter(
            (transaction) =>
              transaction.type ===
              "expense"
          )
          .reduce(
            (
              total,
              transaction
            ) =>
              total +
              Number(
                transaction.amount
              ),
            0
          );


      const closing =
        opening +
        income -
        expenses;


      rows.push({
        month,

        monthValue:
          `${year}-${String(
            month
          ).padStart(2, "0")}`,

        monthLabel:
          monthStart.toLocaleDateString(
            "en-IN",
            {
              month: "long",
            }
          ),

        opening,

        income,

        expenses,

        closing,
      });


    }


    return rows;

  }, [
  transactions,
  funds,
  selectedYear,
]);
  /* ========================================
   FUND-WISE MONTHLY REPORT
======================================== */

const fundReport =
  useMemo(() => {

    return funds
      .filter(
        (fund) =>
          fund.is_active &&
          fund.include_in_masjid_totals !== false
      )
      .map(
        (fund) => {

          const beforePeriod =
            transactions.filter(
              (transaction) =>
                transaction.fund_id ===
                  fund.id &&
                transaction.transaction_date <
                  period.start
            );


          const monthly =
            monthlyTransactions.filter(
              (transaction) =>
                transaction.fund_id ===
                fund.id
            );


          const opening =
            beforePeriod.reduce(
              (
                total,
                transaction
              ) => {

                const amount =
                  Number(
                    transaction.amount
                  );

                return transaction.type ===
                  "income"
                  ? total + amount
                  : total - amount;

              },
              0
            );


          const income =
            monthly
              .filter(
                (transaction) =>
                  transaction.type ===
                  "income"
              )
              .reduce(
                (
                  total,
                  transaction
                ) =>
                  total +
                  Number(
                    transaction.amount
                  ),
                0
              );


          const expenses =
            monthly
              .filter(
                (transaction) =>
                  transaction.type ===
                  "expense"
              )
              .reduce(
                (
                  total,
                  transaction
                ) =>
                  total +
                  Number(
                    transaction.amount
                  ),
                0
              );


          const closing =
            opening +
            income -
            expenses;


          return {
            ...fund,
            opening,
            income,
            expenses,
            closing,
          };

        }
      );

  }, [
    funds,
    transactions,
    monthlyTransactions,
    period,
  ]);


/* ========================================
   SEPARATE FUND MONTHLY REPORT
======================================== */

const separateFundReport =
  useMemo(() => {

    return funds
      .filter(
        (fund) =>
          fund.is_active &&
          fund.include_in_masjid_totals === false
      )
      .map(
        (fund) => {

          const beforePeriod =
            transactions.filter(
              (transaction) =>
                transaction.fund_id ===
                  fund.id &&
                transaction.transaction_date <
                  period.start
            );


          const monthly =
            monthlyTransactions.filter(
              (transaction) =>
                transaction.fund_id ===
                fund.id
            );


          const opening =
            beforePeriod.reduce(
              (
                total,
                transaction
              ) => {

                const amount =
                  Number(
                    transaction.amount
                  );

                return transaction.type ===
                  "income"
                  ? total + amount
                  : total - amount;

              },
              0
            );


          const income =
            monthly
              .filter(
                (transaction) =>
                  transaction.type ===
                  "income"
              )
              .reduce(
                (
                  total,
                  transaction
                ) =>
                  total +
                  Number(
                    transaction.amount
                  ),
                0
              );


          const expenses =
            monthly
              .filter(
                (transaction) =>
                  transaction.type ===
                  "expense"
              )
              .reduce(
                (
                  total,
                  transaction
                ) =>
                  total +
                  Number(
                    transaction.amount
                  ),
                0
              );


          const closing =
            opening +
            income -
            expenses;


          return {
            ...fund,
            opening,
            income,
            expenses,
            closing,
          };

        }
      );

  }, [
    funds,
    transactions,
    monthlyTransactions,
    period,
  ]);

  /* ========================================
     DOWNLOAD PDF
  ======================================== */

  function downloadPdf() {

    const doc =
      new jsPDF();


    const monthLabel =
      formatMonthLabel(
        selectedMonth
      );


    const filterLabel =
      transactionTypeFilter ===
        "income"

        ? "Donations only"

        : transactionTypeFilter ===
          "expense"

          ? "Expenses only"

          : "All transactions";


    const dateFilterLabel =
      transactionFromDate ||
      transactionToDate

        ? `${transactionFromDate || period.start} → ${
            transactionToDate ||
            period.end
          }`

        : "Full month";


    /* ======================================
       HEADER
    ====================================== */

    doc.setFontSize(20);

    doc.setFont(
      "helvetica",
      "bold"
    );


    doc.text(
      "MAHAL MASJID",
      14,
      20
    );


    doc.setFontSize(14);


    doc.text(
      "Monthly Financial Report",
      14,
      29
    );


    doc.setFontSize(10);

    doc.setFont(
      "helvetica",
      "normal"
    );


    doc.text(
      `Reporting Period: ${monthLabel}`,
      14,
      37
    );


    doc.text(
      `Transaction Filter: ${filterLabel}`,
      14,
      44
    );


    doc.text(
      `Date Filter: ${dateFilterLabel}`,
      14,
      51
    );


    /* ======================================
       SUMMARY
    ====================================== */

    autoTable(
      doc,
      {
        startY: 58,

        head: [
          [
            "Opening Balance",
            "Income",
            "Expenses",
            "Closing Balance",
          ],
        ],

        body: [
          [
            formatCurrency(
              openingBalance
            ),

            formatCurrency(
              totalIncome
            ),

            formatCurrency(
              totalExpenses
            ),

            formatCurrency(
              closingBalance
            ),
          ],
        ],

        theme: "grid",

        styles: {
          fontSize: 9,

          cellPadding: 5,
        },
      }
    );


    /* ======================================
       FUND-WISE SUMMARY
    ====================================== */

    const fundStartY =
      doc.lastAutoTable.finalY +
      12;


    doc.setFontSize(
      13
    );

    doc.setFont(
      "helvetica",
      "bold"
    );


    doc.text(
      "Fund-wise Summary",
      14,
      fundStartY
    );


    autoTable(
      doc,
      {
        startY:
          fundStartY + 5,

        head: [
          [
            "Fund",
            "Opening",
            "Income",
            "Expenses",
            "Closing",
          ],
        ],

        body:
          fundReport.map(
            (fund) => [
              fund.name,

              formatCurrency(
                fund.opening
              ),

              formatCurrency(
                fund.income
              ),

              formatCurrency(
                fund.expenses
              ),

              formatCurrency(
                fund.closing
              ),
            ]
          ),

        theme: "grid",

        styles: {
          fontSize: 8,

          cellPadding: 4,
        },
      }
    );

{/* ==================================
    SEPARATE FUNDS SUMMARY
================================== */}

{separateFundReport.length > 0 && (

  <section className="report-section separate-funds-report-section">

    <div className="report-section-heading">

      <div>

        <p className="section-label">
          SEPARATE FUNDS
        </p>

        <h2>
          Separately Managed Funds
        </h2>

        <p>
          These funds are reported independently
          and are not included in the Masjid's
          financial totals.
        </p>

      </div>

    </div>


    <div className="fund-report-table-wrapper">

      <table className="fund-report-table">

        <thead>

          <tr>

            <th>
              Fund
            </th>

            <th>
              Opening
            </th>

            <th>
              Income
            </th>

            <th>
              Expenses
            </th>

            <th>
              Closing
            </th>

          </tr>

        </thead>


        <tbody>

          {separateFundReport.map(
            (fund) => (

              <tr key={fund.id}>

                <td>
                  <strong>
                    {fund.name}
                  </strong>
                </td>

                <td>
                  {formatCurrency(
                    fund.opening
                  )}
                </td>

                <td className="report-table-income">
                  +
                  {" "}
                  {formatCurrency(
                    fund.income
                  )}
                </td>

                <td className="report-table-expense">
                  -
                  {" "}
                  {formatCurrency(
                    fund.expenses
                  )}
                </td>

                <td>
                  <strong>
                    {formatCurrency(
                      fund.closing
                    )}
                  </strong>
                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>

  </section>

)}
    /* ======================================
       TRANSACTIONS
    ====================================== */

    const transactionStartY =
      doc.lastAutoTable.finalY +
      12;


    doc.setFontSize(
      13
    );

    doc.setFont(
      "helvetica",
      "bold"
    );


    const transactionLabel =
      transactionTypeFilter ===
        "income"

        ? "Donation Transactions"

        : transactionTypeFilter ===
          "expense"

          ? "Expense Transactions"

          : "Transactions";


    doc.text(
      transactionLabel,
      14,
      transactionStartY
    );


    autoTable(
      doc,
      {
        startY:
          transactionStartY + 5,

        head: [
          [
            "Date",
            "Type",
            "Fund",
            "Category",
            "Amount",
          ],
        ],

        body:
          filteredTransactions.map(
            (transaction) => [

              formatDate(
                transaction.transaction_date
              ),

              transaction.type ===
                "income"
                ? "Income"
                : "Expense",

              transaction.funds?.name ||
                "Unknown",

              transaction.category,

              `${
                transaction.type ===
                  "income"
                  ? "+"
                  : "-"
              } ${formatCurrency(
                Number(
                  transaction.amount
                )
              )}`,
            ]
          ),

        theme: "grid",

        styles: {
          fontSize: 7.5,

          cellPadding: 3,
        },

        columnStyles: {
          4: {
            halign: "right",
          },
        },
      }
    );


    /* ======================================
       FOOTER
    ====================================== */

    const pageCount =
      doc.getNumberOfPages();


    for (
      let page = 1;
      page <= pageCount;
      page++
    ) {

      doc.setPage(
        page
      );


      doc.setFontSize(
        8
      );

      doc.setFont(
        "helvetica",
        "normal"
      );


      doc.text(
        `Generated on ${new Date().toLocaleDateString(
          "en-IN"
        )}`,
        14,
        285
      );


      doc.text(
        `Page ${page} of ${pageCount}`,
        180,
        285
      );
    }


    /* ======================================
       SAVE
    ====================================== */

    const safeMonth =
      selectedMonth.replace(
        "-",
        "_"
      );


    doc.save(
      `Mahal-Financial-Report-${safeMonth}.pdf`
    );
  }


  /* ========================================
     LOADING
  ======================================== */

  if (loading) {

    return (
      <div className="admin-loading">
        Loading financial report...
      </div>
    );
  }


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="financial-report-page">

      {/* ==================================
          HEADER
      ================================== */}

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            FINANCIAL REPORTING
          </p>

          <h1>
            Monthly Report
          </h1>

          <p>
            Review income, expenses and fund
            balances for a selected period.
          </p>

        </div>


        <div className="report-header-actions">

  <button
    type="button"
    className="secondary-button"
    onClick={
      loadReportData
    }
  >
    ↻ Refresh
  </button>


  {canImportTransactions && (

    <button
      type="button"
      className="secondary-button"
      onClick={() => {

        setShowTransactionImport(
          true
        );

        setError("");
        setImportErrors([]);
        setImportResult(null);

      }}
    >
      ↑ Import Historical Data
    </button>

  )}


  <button
    type="button"
    className="primary-button"
    onClick={
      downloadPdf
    }
  >
    ↓ Download PDF
  </button>

</div>

      </div>


      {/* ==================================
    REPORT PERIOD SELECTORS
================================== */}

<div className="report-period-bar">

  <div className="report-period-control">

    <label>
      Reporting Year
    </label>

    <select
      value={selectedYear}
      onChange={(event) => {

        const year =
          event.target.value;

        setSelectedYear(
          year
        );

        setSelectedMonth(
          `${year}-${selectedMonth.split("-")[1]}`
        );

        setTransactionFromDate("");
        setTransactionToDate("");

      }}
    >

      {Array.from(
        {
          length: 10,
        },
        (_, index) => {

          const year =
            now.getFullYear() -
            5 +
            index;

          return (
            <option
              key={year}
              value={String(year)}
            >
              {year}
            </option>
          );

        }
      )}

    </select>

  </div>


  <div className="report-period-control">

    <label>
      Reporting Month
    </label>

    <input
      type="month"
      value={selectedMonth}
      onChange={(event) => {

        const value =
          event.target.value;

        setSelectedMonth(
          value
        );

        setSelectedYear(
          value.split("-")[0]
        );

        setTransactionFromDate("");
        setTransactionToDate("");

      }}
    />

  </div>


  <strong>
    {formatMonthLabel(
      selectedMonth
    )}
  </strong>

</div>


      {/* ==================================
          ERROR
      ================================== */}

      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}


      {/* ==================================
          REPORT CONTENT
      ================================== */}

      <>

        {/* ==================================
            SUMMARY
        ================================== */}

        <div className="monthly-report-summary">

          <div className="monthly-report-card">

            <span>
              OPENING BALANCE
            </span>

            <strong>
              {formatCurrency(
                openingBalance
              )}
            </strong>

          </div>


          <div className="monthly-report-card income-card">

            <span>
              TOTAL INCOME
            </span>

            <strong>
              +{" "}
              {formatCurrency(
                totalIncome
              )}
            </strong>

          </div>


          <div className="monthly-report-card expense-card">

            <span>
              TOTAL EXPENSES
            </span>

            <strong>
              -{" "}
              {formatCurrency(
                totalExpenses
              )}
            </strong>

          </div>


          <div className="monthly-report-card">

            <span>
              CLOSING BALANCE
            </span>

            <strong>
              {formatCurrency(
                closingBalance
              )}
            </strong>

          </div>

        </div>
{/* ==================================
    MONTHLY BALANCE REGISTER
================================== */}

<section className="report-section monthly-balance-register-section">

  <div className="report-section-heading">

    <div>

      <h2>
        Monthly Balance Register
      </h2>

      <p>
        Opening and closing balances for
        each month of {selectedYear}.
      </p>

    </div>

  </div>


  <div className="fund-report-table-wrapper">

    <table className="fund-report-table monthly-balance-register-table">

      <thead>

        <tr>

          <th>
            Month
          </th>

          <th>
            Opening Balance
          </th>

          <th>
            Income
          </th>

          <th>
            Expenses
          </th>

          <th>
            Closing Balance
          </th>

        </tr>

      </thead>


      <tbody>

        {monthlyBalanceRegister.map(
          (month) => (

           <tr
  key={
    month.monthValue
  }
  className={
    month.monthValue ===
    selectedMonth
      ? "monthly-balance-current"
      : ""
  }
>

              <td>

                <strong>
                  {
                    month.monthLabel
                  }
                </strong>

              </td>


              <td>
                {
                  formatCurrency(
                    month.opening
                  )
                }
              </td>


              <td className="report-table-income">

                +{" "}

                {
                  formatCurrency(
                    month.income
                  )
                }

              </td>


              <td className="report-table-expense">

                -{" "}

                {
                  formatCurrency(
                    month.expenses
                  )
                }

              </td>


              <td>

                <strong>
                  {
                    formatCurrency(
                      month.closing
                    )
                  }
                </strong>

              </td>

            </tr>

          )
        )}

      </tbody>

    </table>

  </div>

</section>

        {/* ==================================
            FUND-WISE SUMMARY
        ================================== */}

        <section className="report-section">

          <div className="report-section-heading">

            <div>

              <h2>
                Fund-wise Summary
              </h2>

              <p>
                Performance of each active fund
                during{" "}
                {formatMonthLabel(
                  selectedMonth
                )}
                .
              </p>

            </div>

          </div>


          <div className="fund-report-table-wrapper">

            <table className="fund-report-table">

              <thead>

                <tr>

                  <th>
                    Fund
                  </th>

                  <th>
                    Opening
                  </th>

                  <th>
                    Income
                  </th>

                  <th>
                    Expenses
                  </th>

                  <th>
                    Closing
                  </th>

                </tr>

              </thead>


              <tbody>

                {fundReport.map(
                  (fund) => (

                    <tr
                      key={
                        fund.id
                      }
                    >

                      <td>

                        <strong>
                          {
                            fund.name
                          }
                        </strong>

                      </td>


                      <td>
                        {formatCurrency(
                          fund.opening
                        )}
                      </td>


                      <td className="report-table-income">

                        +
                        {" "}
                        {formatCurrency(
                          fund.income
                        )}

                      </td>


                      <td className="report-table-expense">

                        -
                        {" "}
                        {formatCurrency(
                          fund.expenses
                        )}

                      </td>


                      <td>

                        <strong>
                          {formatCurrency(
                            fund.closing
                          )}
                        </strong>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* ==================================
            TRANSACTIONS
        ================================== */}

        <section className="report-section">

          <div className="report-section-heading">

            <div>

              <h2>
                Transactions in This Period
              </h2>

              <p>
                {
                  filteredTransactions.length
                }{" "}
                shown of{" "}
                {
                  monthlyTransactions.length
                }{" "}
                recorded transactions.
              </p>

            </div>

          </div>


          {/* TRANSACTION FILTERS */}

          <div className="report-transaction-filters">

            {/* TYPE */}

            <div className="report-filter-field">

              <label>
                Transaction Type
              </label>

              <select
                value={
                  transactionTypeFilter
                }
                onChange={(event) =>
                  setTransactionTypeFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All Transactions
                </option>

                <option value="income">
                  Donations Only
                </option>

                <option value="expense">
                  Expenses Only
                </option>

              </select>

            </div>


            {/* FROM */}

            <div className="report-filter-field">

              <label>
                From Date
              </label>

              <input
                type="date"
                value={
                  transactionFromDate
                }
                min={
                  period.start
                }
                max={
                  period.end
                }
                onChange={(event) =>
                  setTransactionFromDate(
                    event.target.value
                  )
                }
              />

            </div>


            {/* TO */}

            <div className="report-filter-field">

              <label>
                To Date
              </label>

              <input
                type="date"
                value={
                  transactionToDate
                }
                min={
                  period.start
                }
                max={
                  period.end
                }
                onChange={(event) =>
                  setTransactionToDate(
                    event.target.value
                  )
                }
              />

            </div>


            {/* RESET */}

            <button
              type="button"
              className="secondary-button report-filter-reset"
              onClick={() => {

                setTransactionTypeFilter(
                  "all"
                );

                setTransactionFromDate(
                  ""
                );

                setTransactionToDate(
                  ""
                );
              }}
            >
              Reset
            </button>

          </div>


          {/* TRANSACTION TABLE */}

          {filteredTransactions.length ===
            0 ? (

            <div className="admin-empty-card">

              <h3>
                No matching transactions
              </h3>

              <p>
                Try changing the transaction
                type or date filters.
              </p>

            </div>

          ) : (

            <div className="transactions-table-card">

              <div className="transactions-table-wrapper">

                <table className="transactions-table">

                  <thead>

                    <tr>

                      <th>
                        Date
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Fund
                      </th>

                      <th>
                        Category
                      </th>

                      <th>
                        Description
                      </th>

                      <th className="amount-column">
                        Amount
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredTransactions.map(
                      (transaction) => (

                        <tr
  key={transaction.id}
  className="transaction-clickable-row"
  onClick={() =>
    navigate(
      `/admin/transactions/${transaction.id}`
    )
  }
  onKeyDown={(event) => {

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {

      event.preventDefault();

      navigate(
        `/admin/transactions/${transaction.id}`
      );
    }

  }}
  tabIndex={0}
  role="button"
>

                          <td>

                            <span className="transaction-table-link">
  {formatDate(
    transaction.transaction_date
  )}
</span>

                          </td>


                          <td>

                            <span
                              className={
                                transaction.type ===
                                "income"

                                  ? "transaction-badge income-badge"

                                  : "transaction-badge expense-badge"
                              }
                            >

                              {
                                transaction.type ===
                                "income"
                                  ? "Income"
                                  : "Expense"
                              }

                            </span>

                          </td>


                          <td>

                            {
                              transaction.funds?.name ||
                              "Unknown Fund"
                            }

                          </td>


                          <td>

                            {
                              transaction.category
                            }

                          </td>


                          <td>

                            {
                              transaction.description ||
                              "—"
                            }

                          </td>


                          <td
                            className={
                              transaction.type ===
                              "income"

                                ? "amount-income"

                                : "amount-expense"
                            }
                          >

                            {
                              transaction.type ===
                              "income"
                                ? "+"
                                : "-"
                            }{" "}

                            {formatCurrency(
                              Number(
                                transaction.amount
                              )
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


        {/* ==================================
            REPORT NOTE
        ================================== */}

        <div className="report-note">

          <span>
            ✓
          </span>

          <div>

            <strong>
              Report calculation
            </strong>

            <p>
              Opening balance includes all
              financial activity recorded before
              the selected month. Closing balance
              equals opening balance plus income
              minus expenses. Transaction filters
              affect the transaction list and PDF,
              but do not change the monthly summary
              figures.
            </p>

          </div>

        </div>

      </>

{showTransactionImport && (

  <div className="transaction-import-overlay">

    <div className="transaction-import-modal">

      <button
        type="button"
        className="transaction-import-close"
        onClick={() => {

          if (!importing) {

            setShowTransactionImport(
              false
            );

            setImportFile(
              null
            );

            setImportRows([]);

            setImportErrors([]);

            setImportResult(
              null
            );
          }

        }}
        disabled={
          importing
        }
      >
        ×
      </button>


      <p className="section-label">
        FINANCIAL DATA
      </p>


      <h2>
        Import Historical Transactions
      </h2>


      <p className="transaction-import-intro">
        Bring older donation and expense records
        into the financial system from a CSV file.
        Existing records are checked for duplicates
        before importing.
      </p>


      {/* TEMPLATE */}

      <div className="transaction-import-template">

        <div>

          <strong>
            Use the correct spreadsheet format
          </strong>

          <p>
            Download the template before preparing
            your historical data.
          </p>

        </div>


        <button
          type="button"
          className="secondary-button"
          onClick={
            downloadTransactionTemplate
          }
        >
          ↓ Download Template
        </button>

      </div>


      {/* UPLOAD */}

      <label
        htmlFor="historical-transaction-file"
        className="transaction-import-upload"
      >

        <span className="transaction-import-upload-icon">
          ↑
        </span>


        <strong>
          Choose CSV File
        </strong>


        <small>
          Donations and expenses can be mixed
          in the same file.
        </small>

      </label>


      <input
        id="historical-transaction-file"
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={
          prepareImportFile
        }
      />


      {/* FILE */}

      {importFile && (

        <div className="transaction-import-file">

          <strong>
            {importFile.name}
          </strong>

          <span>
            {importRows.length} rows detected
          </span>

        </div>

      )}


      {/* PREVIEW */}

      {importRows.length > 0 && (

        <div className="transaction-import-preview">

          <div className="transaction-import-preview-heading">

            <strong>
              Import Preview
            </strong>

            <span>
              First 6 rows
            </span>

          </div>


          <div className="transaction-import-table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Date
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Fund
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Party
                  </th>

                </tr>

              </thead>


              <tbody>

                {importRows
                  .slice(0, 6)
                  .map(
                    (
                      row,
                      index
                    ) => (

                      <tr
                        key={
                          index
                        }
                      >

                        <td>
                          {
                            row.date
                          }
                        </td>

                        <td>
                          {
                            row.type
                          }
                        </td>

                        <td>
                          ₹{" "}
                          {
                            row.amount
                          }
                        </td>

                        <td>
                          {
                            row.fund
                          }
                        </td>

                        <td>
                          {
                            row.category
                          }
                        </td>

                        <td>
                          {
                            row.partyName ||
                            "—"
                          }
                        </td>

                      </tr>

                    )
                  )}

              </tbody>

            </table>

          </div>

        </div>

      )}


      {/* VALIDATION ERRORS */}

      {importErrors.length > 0 && (

        <div className="transaction-import-errors">

          <strong>
            Import needs attention
          </strong>


          <p>
            {importErrors.length} row
            {
              importErrors.length === 1
                ? ""
                : "s"
            }{" "}
            could not be imported.
          </p>


          <div>

            {importErrors
              .slice(0, 10)
              .map(
                (
                  item,
                  index
                ) => (

                  <div
                    key={
                      index
                    }
                  >

                    <strong>
                      Row {
                        item.rowNumber
                      }
                    </strong>

                    <span>
                      {
                        item.errors.join(
                          " "
                        )
                      }
                    </span>

                  </div>

                )
              )}

          </div>

        </div>

      )}


      {/* RESULT */}

      {importResult && (

        <div className="transaction-import-result">

          <div>

            <strong>
              {
                importResult.imported
              }
            </strong>

            <span>
              Imported
            </span>

          </div>


          <div>

            <strong>
              {
                importResult.failed
              }
            </strong>

            <span>
              Failed
            </span>

          </div>

        </div>

      )}


      {/* ACTIONS */}

      <div className="transaction-import-actions">

        <button
          type="button"
          className="secondary-button"
          onClick={() => {

            setShowTransactionImport(
              false
            );

            setImportFile(
              null
            );

            setImportRows([]);

            setImportErrors([]);

            setImportResult(
              null
            );

          }}
          disabled={
            importing
          }
        >
          Close
        </button>


        <button
          type="button"
          className="primary-button"
          onClick={
            runTransactionImport
          }
          disabled={
            importing ||
            importRows.length === 0
          }
        >
          {
            importing
              ? "Importing..."
              : `Import ${
                  importRows.length
                } Transactions`
          }
        </button>

      </div>

    </div>

  </div>

)}
    </div>
  );
}


export default Reports;
