import React, { useState } from "react";

export default function App() {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [codeMap, setCodeMap] = useState({});
  const [uniqueCodes, setUniqueCodes] = useState([]);
  const [mappingComplete, setMappingComplete] = useState(false);

  const parseFile = (text) => {
    const lines = text.split("\n");

    let currentStudentId = "";
    let currentLast = "";
    let currentFirst = "";

    const parsed = [];
    const errorList = [];
    const codesFound = new Set();

    for (let line of lines) {
      // ✅ Student header
      const studentMatch = line.match(/^(\d{9})\s+(.+?),\s*(.+)$/);
      if (studentMatch) {
        currentStudentId = studentMatch[1];
        currentLast = studentMatch[2].trim();
        currentFirst = studentMatch[3].trim();
        continue;
      }

      // ✅ Transaction line
      const txnMatch = line.match(
        /^\s*(\d+)\s+(\d+)\s+(.+?)\s+([\d,]+\.\d{2})\s+(\d{2}-[A-Z]{3}-\d{4})/
      );

      if (txnMatch) {
        const detailCode = txnMatch[2];
        codesFound.add(detailCode);

        const row = {
          studentId: currentStudentId,
          lastName: currentLast,
          firstName: currentFirst,
          tranNumber: txnMatch[1],
          detailCode,
          description: txnMatch[3].trim(),
          amount: txnMatch[4].replace(/,/g, ""),
          effectiveDate: txnMatch[5],
        };

        // ✅ Validation
        const rowErrors = [];

        if (!/^\d{9}$/.test(row.studentId)) rowErrors.push("Invalid ID");
        if (!/^\d+$/.test(row.tranNumber)) rowErrors.push("Bad Tran #");
        if (!/^\d+$/.test(row.detailCode)) rowErrors.push("Bad Code");
        if (isNaN(Number(row.amount))) rowErrors.push("Bad Amount");
        if (!/^\d{2}-[A-Z]{3}-\d{4}$/.test(row.effectiveDate))
          rowErrors.push("Bad Date");

        if (rowErrors.length) {
          errorList.push({ row: parsed.length, issues: rowErrors });
        }

        row.errors = rowErrors;
        parsed.push(row);
      }
    }

    setRows(parsed);
    setErrors(errorList);
    setUniqueCodes([...codesFound].sort());
    setMappingComplete(false);
  };

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => parseFile(e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  };

  // ✅ Handle dropdown mapping
  const updateCodeType = (code, type) => {
    setCodeMap((prev) => ({ ...prev, [code]: type }));
  };

  // ✅ Check if all codes are assigned
  const finalizeMapping = () => {
    const allMapped = uniqueCodes.every((code) => codeMap[code]);
    if (!allMapped) {
      alert("Please assign all detail codes before continuing.");
      return;
    }
    setMappingComplete(true);
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
          codeMap[r.detailCode],
          `"${r.description}"`,
          r.amount,
          r.effectiveDate,
        ].join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>LIS → CSV Converter (User Mapping Mode)</h2>

      {/* Upload */}
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
        Rows: {rows.length} | Errors: {errors.length}
      </p>

      {/* ✅ Step 2: Mapping UI */}
      {uniqueCodes.length > 0 && !mappingComplete && (
        <div>
          <h3>Assign Detail Code Types</h3>

          {uniqueCodes.map((code) => (
            <div key={code} style={{ marginBottom: 10 }}>
              <strong>{code}</strong>
              <select
                onChange={(e) => updateCodeType(code, e.target.value)}
                value={codeMap[code] || ""}
                style={{ marginLeft: 10 }}
              >
                <option value="">Select Type</option>
                <option value="Housing">Housing</option>
                <option value="Meal">Meal</option>
                <option value="Other">Other</option>
              </select>
            </div>
          ))}

          <button onClick={finalizeMapping}>
            Confirm Mapping
          </button>
        </div>
      )}

      {/* ✅ Table after mapping */}
      {mappingComplete && (
        <>
          <button onClick={downloadCSV}>
            Download CSV
          </button>

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
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: r.errors.length
                      ? "#ffe6e6"
                      : "white",
                  }}
                >
                  <td>{r.studentId}</td>
                  <td>{r.lastName}</td>
                  <td>{r.firstName}</td>
                  <td>{r.tranNumber}</td>
                  <td>{r.detailCode}</td>
                  <td>{codeMap[r.detailCode]}</td>
                  <td>{r.description}</td>
                  <td>{r.amount}</td>
                  <td>{r.effectiveDate}</td>
                  <td style={{ color: "red" }}>
                    {r.errors.join(", ")}
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