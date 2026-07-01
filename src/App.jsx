import React, { useState } from "react";

export default function App() {
  const [rows, setRows] = useState([]);
  const [uniqueCodes, setUniqueCodes] = useState([]);
  const [codeMap, setCodeMap] = useState({});
  const [mappingComplete, setMappingComplete] = useState(false);

  const parseFile = (text) => {
    const lines = text.split("\n");

    let currentStudentId = "";
    let currentLast = "";
    let currentFirst = "";
    let hasTransaction = false;

    const parsed = [];
    const codesFound = new Set();

    const pushEmptyStudent = () => {
      if (currentStudentId && !hasTransaction) {
        const studentErrors = [];

        if (!/^\d{9}$/.test(currentStudentId)) {
          studentErrors.push("Invalid Student ID");
        }

        parsed.push({
          studentId: currentStudentId,
          lastName: currentLast,
          firstName: currentFirst,
          tranNumber: "",
          detailCode: "",
          description: "",
          amount: "",
          effectiveDate: "",
          errors: studentErrors,
          warnings: ["No transactions"],
        });
      }
    };

    for (let rawLine of lines) {
      const line = rawLine.trim();

      // ✅ Skip noise
      if (
        !line ||
        line.includes("PAGE") ||
        line.includes("NET CHANGE") ||
        line.includes("CONTINUED") ||
        line.includes("Batch Room") ||
        line.includes("HOUSING ASSESSMENTS")
      ) {
        continue;
      }

      // ✅ FIXED student header (looser, but safe)
      const studentMatch = line.match(/^(\d{5,})\s+(.+?),\s*(.+)$/);
      if (studentMatch) {
        pushEmptyStudent();

        currentStudentId = studentMatch[1];
        currentLast = studentMatch[2].trim();
        currentFirst = studentMatch[3].trim();
        hasTransaction = false;

        continue;
      }

      // ✅ STRICT transaction parsing (don’t loosen this)
      const txnMatch = line.match(
        /^(\d+)\s+(\d+)\s+(.+?)\s+([\d,]*\.\d{2})?\s*(\d{2}-[A-Z]{3}-\d{4})?$/
      );

      if (txnMatch && currentStudentId) {
        hasTransaction = true;

        const row = {
          studentId: currentStudentId,
          lastName: currentLast,
          firstName: currentFirst,
          tranNumber: txnMatch[1] || "",
          detailCode: txnMatch[2] || "",
          description: (txnMatch[3] || "").trim(),
          amount: (txnMatch[4] || "").replace(/,/g, ""),
          effectiveDate: txnMatch[5] || "",
          errors: [],
          warnings: [],
        };

        // ✅ VALIDATION
        if (!/^\d{9}$/.test(row.studentId)) {
          row.errors.push("Invalid Student ID");
        }

        if (!row.tranNumber) {
          row.errors.push("Missing Tran Number");
        }

        if (!row.detailCode) {
          row.errors.push("Missing Detail Code");
        }

        if (!row.amount || isNaN(Number(row.amount))) {
          row.errors.push("Missing/Invalid Amount");
        }

        if (!/^\d{2}-[A-Z]{3}-\d{4}$/.test(row.effectiveDate)) {
          row.errors.push("Invalid Date");
        }

        parsed.push(row);

        if (/^\d+$/.test(row.detailCode)) {
          codesFound.add(row.detailCode);
        }
      }
    }

    pushEmptyStudent();

    const codesArray = [...codesFound].sort();
    const defaultMap = {};

    codesArray.forEach((c) => {
      defaultMap[c] = "Housing";
    });

    setRows(parsed);
    setUniqueCodes(codesArray);
    setCodeMap(defaultMap);
    setMappingComplete(false);
  };

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseFile(e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  };

  const updateCodeType = (code, type) => {
    setCodeMap((prev) => ({
      ...prev,
      [code]: type,
    }));
  };

  const downloadCSV = () => {
    const header = [
      "Student ID",
      "Last Name",
      "First Name",
      "Tran Number",
      "Detail Code",
      "Type",
      "Description",
      "Amount",
      "Effective Date",
      "Issues",
    ];

    const csvRows = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.studentId,
          r.lastName,
          r.firstName,
          r.tranNumber,
          r.detailCode,
          codeMap[r.detailCode] || "",
          `"${r.description}"`,
          r.amount,
          r.effectiveDate,
          `"${[...r.errors, ...r.warnings].join("; ")}"`,
        ].join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>LIS → CSV Converter</h2>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: "2px dashed #aaa",
          padding: 30,
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        Drag & Drop File Here
      </div>

      <input
        type="file"
        accept=".txt,.lis,.rtf"
        onChange={(e) => readFile(e.target.files[0])}
      />

      <p>
        Rows: {rows.length} | Errors:{" "}
        {rows.filter((r) => r.errors.length).length} | Warnings:{" "}
        {rows.filter((r) => r.warnings.length).length}
      </p>

      {uniqueCodes.length > 0 && !mappingComplete && (
        <div>
          <h3>Assign Detail Code Types</h3>

          {uniqueCodes.map((code) => (
            <div key={code}>
              <strong>{code}</strong>
              <select
                value={codeMap[code]}
                onChange={(e) => updateCodeType(code, e.target.value)}
                style={{ marginLeft: 10 }}
              >
                <option value="Housing">Housing</option>
                <option value="Meal">Meal</option>
                <option value="Other">Other</option>
              </select>
            </div>
          ))}

          <button onClick={() => setMappingComplete(true)}>
            Confirm Mapping
          </button>
        </div>
      )}

      {mappingComplete && (
        <>
          <button onClick={downloadCSV}>Download CSV</button>

          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>ID</th>
                <th>Last</th>
                <th>First</th>
                <th>Tran</th>
                <th>Code</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: r.errors.length
                      ? "#ffe6e6"
                      : r.warnings.length
                      ? "#fff8e1"
                      : "white",
                  }}
                >
                  <td>{r.studentId}</td>
                  <td>{r.lastName}</td>
                  <td>{r.firstName}</td>
                  <td>{r.tranNumber}</td>
                  <td>{r.detailCode}</td>
                  <td>{codeMap[r.detailCode] || ""}</td>
                  <td>{r.description}</td>
                  <td>{r.amount}</td>
                  <td>{r.effectiveDate}</td>
                  <td>
                    <div style={{ color: "red" }}>
                      {r.errors.join(", ")}
                    </div>
                    <div style={{ color: "#b58900" }}>
                      {r.warnings.join(", ")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}