import { useState } from "react";

export default function App() {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);

  const parseFile = (text) => {
    const lines = text.split("\n");

    let currentStudentId = "";
    let currentLast = "";
    let currentFirst = "";

    const parsed = [];
    const errorList = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

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
        const row = {
          studentId: currentStudentId,
          lastName: currentLast,
          firstName: currentFirst,
          tranNumber: txnMatch[1],
          detailCode: txnMatch[2],
          description: txnMatch[3].trim(),
          amount: txnMatch[4].replace(/,/g, ""),
          effectiveDate: txnMatch[5],
        };

        // ✅ Validation
        const rowErrors = [];

        if (!/^\d{9}$/.test(row.studentId)) rowErrors.push("Invalid ID");
        if (!/^\d+$/.test(row.tranNumber)) rowErrors.push("Bad Tran #");
        if (!/^\d+$/.test(row.detailCode)) rowErrors.push("Bad Detail Code");
        if (isNaN(Number(row.amount))) rowErrors.push("Invalid Amount");
        if (!/^\d{2}-[A-Z]{3}-\d{4}$/.test(row.effectiveDate))
          rowErrors.push("Bad Date");

        if (rowErrors.length) {
          errorList.push({
            row: parsed.length,
            issues: rowErrors,
          });
        }

        row.errors = rowErrors;

        parsed.push(row);
      }
    }

    setRows(parsed);
    setErrors(errorList);
  };

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => parseFile(e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    readFile(file);
  };

  const downloadCSV = () => {
    const header = [
      "Student ID",
      "Last Name",
      "First Name",
      "Tran Number",
      "Detail Code",
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
      <h2>Banner LIS → CSV Converter (Safe Mode)</h2>

      {/* Drag & Drop */}
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
        Drag & Drop file here
      </div>

      <input
        type="file"
        accept=".txt,.lis,.rtf"
        onChange={(e) => readFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={downloadCSV} disabled={!rows.length}>
        Download CSV ({rows.length})
      </button>

      <p>
        ✅ Rows: {rows.length} | ❌ Errors: {errors.length}
      </p>

      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>ID</th>
            <th>Last</th>
            <th>First</th>
            <th>Tran</th>
            <th>Code</th>
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
                backgroundColor: r.errors.length ? "#ffe6e6" : "white",
              }}
            >
              <td>{r.studentId}</td>
              <td>{r.lastName}</td>
              <td>{r.firstName}</td>
              <td>{r.tranNumber}</td>
              <td>{r.detailCode}</td>
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
    </div>
  );
}