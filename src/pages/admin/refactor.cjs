const fs = require('fs');

let content = fs.readFileSync('d:\\Techi Nutpam files\\tn-hrms\\frontend\\src\\pages\\admin\\AdminInvoices.jsx', 'utf-8');

// Add useNavigate
content = content.replace("import { useConfirm } from '../../context/ConfirmContext';", "import { useConfirm } from '../../context/ConfirmContext';\nimport { useNavigate } from 'react-router-dom';");

// Add navigate = useNavigate()
content = content.replace('const { confirm } = useConfirm();', 'const { confirm } = useConfirm();\n  const navigate = useNavigate();');

// Replace handleOpenCreateModal
content = content.replace(/const handleOpenCreateModal = async \(type = 'Invoice'\) => \{[\s\S]*?^\s*\};\n/m, `const handleOpenCreateModal = (type = 'Invoice') => {
    navigate(\`/admin/invoices/create?type=\${encodeURIComponent(type)}\`);
  };\n`);

// Replace handleOpenEditModal
content = content.replace(/const handleOpenEditModal = \(invoice\) => \{[\s\S]*?^\s*setShowCreateModal\(true\);\n  \};\n/m, `const handleOpenEditModal = (invoice) => {
    navigate(\`/admin/invoices/edit/\${invoice._id}\`);
  };\n`);

// Remove Modal states
content = content.replace(/const \[showCreateModal, setShowCreateModal\] = useState\(false\);\n[\s\S]*?const \[isDrawing, setIsDrawing\] = useState\(false\);\n/m, '');

// Remove not needed stuff
content = content.replace(/const handleTypeChange = async \(newType\) => \{[\s\S]*?^\s*\};\n/m, '');
content = content.replace(/const handleLogoUpload = \(e\) => \{[\s\S]*?^\s*\};\n/m, '');
content = content.replace(/const handleItemChange = \(index, field, value\) => \{[\s\S]*?^\s*\};\n/m, '');
content = content.replace(/const addItemRow = \(\) => \{[\s\S]*?^\s*\};\n/m, '');
content = content.replace(/const removeItemRow = \(index\) => \{[\s\S]*?^\s*\};\n/m, '');
content = content.replace(/const calculateTotals = \(\) => \{[\s\S]*?^\s*\};\n\n  const \{ subtotal, taxAmount, totalAmount \} = calculateTotals\(\);\n/m, '');
content = content.replace(/const startDrawing = \(e\) => \{[\s\S]*?^\s*const handleSubmitInvoice = async \(e\) => \{[\s\S]*?^\s*\};\n/m, '');

content = content.replace("const symbol = CURRENCY_SYMBOLS[formData.currency] || '₹';", "");

// Remove huge Create/Edit modal markup
content = content.replace(/\{\/\* ========================================================= \*\/\}\n\s*\{\/\* CREATE \/ EDIT INVOICE MODAL \*\/\}\n\s*\{\/\* ========================================================= \*\/\}\n\s*\{showCreateModal && \([\s\S]*?\{\/\* ========================================================= \*\/\}\n\s*\{\/\* SIGNATURE CREATION MODAL \*\/\}\n\s*\{\/\* ========================================================= \*\/\}\n\s*\{showSignatureModal && \([\s\S]*?\{\/\* ========================================================= \*\/\}\n\s*\{\/\* SEND EMAIL MODAL \*\/\}\n/m, '{/* ========================================================= */}\n      {/* SEND EMAIL MODAL */}\n');


// Additionally clean up constants like DEFAULT_TAX_INVOICE_BANKING, EMPTY_BANKING, initialInvoiceState which are not needed anymore
content = content.replace(/\/\/ Default Banking Details for Tax Invoice only\nconst DEFAULT_TAX_INVOICE_BANKING = \{[\s\S]*?\};\n\nconst EMPTY_BANKING = \{[\s\S]*?\};\n\nconst initialInvoiceState = \{[\s\S]*?\};\n/m, '');

fs.writeFileSync('d:\\Techi Nutpam files\\tn-hrms\\frontend\\src\\pages\\admin\\AdminInvoices.jsx', content, 'utf-8');
