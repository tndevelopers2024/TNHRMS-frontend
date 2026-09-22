import re

with open('d:\\Techi Nutpam files\\tn-hrms\\frontend\\src\\pages\\admin\\AdminInvoices.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useNavigate
content = content.replace("import { useConfirm } from '../../context/ConfirmContext';", "import { useConfirm } from '../../context/ConfirmContext';\nimport { useNavigate } from 'react-router-dom';")

# Add navigate = useNavigate()
content = content.replace('const { confirm } = useConfirm();', 'const { confirm } = useConfirm();\n  const navigate = useNavigate();')

# Replace handleOpenCreateModal
content = re.sub(r'const handleOpenCreateModal = async \(type = \'Invoice\'\) => \{.*?\n  \};\n', 'const handleOpenCreateModal = (type = \'Invoice\') => {\n    navigate(`/admin/invoices/create?type=${encodeURIComponent(type)}`);\n  };\n', content, flags=re.DOTALL)

# Replace handleOpenEditModal
content = re.sub(r'const handleOpenEditModal = \(invoice\) => \{.*?    setShowCreateModal\(true\);\n  \};\n', 'const handleOpenEditModal = (invoice) => {\n    navigate(`/admin/invoices/edit/${invoice._id}`);\n  };\n', content, flags=re.DOTALL)

# Remove Modal states
content = re.sub(r'const \[showCreateModal, setShowCreateModal\] = useState\(false\);\n.*?const \[isDrawing, setIsDrawing\] = useState\(false\);\n', '', content, flags=re.DOTALL)

# Remove initialInvoiceState and other not needed stuff inside component
content = re.sub(r'const handleTypeChange = async \(newType\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)
content = re.sub(r'const handleLogoUpload = \(e\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)
content = re.sub(r'const handleItemChange = \(index, field, value\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)
content = re.sub(r'const addItemRow = \(\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)
content = re.sub(r'const removeItemRow = \(index\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)
content = re.sub(r'const calculateTotals = \(\) => \{.*?\n  \};\n\n  const \{ subtotal, taxAmount, totalAmount \} = calculateTotals\(\);\n', '', content, flags=re.DOTALL)
content = re.sub(r'const startDrawing = \(e\) => \{.*?\n  \};\n\n  const draw = \(e\) => \{.*?\n  \};\n\n  const stopDrawing = \(\) => \{.*?\n  \};\n\n  const clearCanvas = \(\) => \{.*?\n  \};\n\n  const handleSaveSignature = \(\) => \{.*?\n  \};\n\n  const handleSignatureUpload = \(e\) => \{.*?\n  \};\n\n  const handleSubmitInvoice = async \(e\) => \{.*?\n  \};\n', '', content, flags=re.DOTALL)

content = content.replace("const symbol = CURRENCY_SYMBOLS[formData.currency] || '₹';", "")

# Remove huge Create/Edit modal markup
# The comment is: {/* ========================================================= */}
# {/* CREATE / EDIT INVOICE MODAL */}
# {/* ========================================================= */}
content = re.sub(r'\{\/\* ========================================================= \*\/\}\n\s*\{\/\* CREATE / EDIT INVOICE MODAL \*\/\}\n\s*\{\/\* ========================================================= \*\/\}\n\s*\{showCreateModal && \(\n\s*<div.*?\{\/\* ========================================================= \*\/\}\n\s*\{\/\* SIGNATURE CREATION MODAL \*\/\}\n\s*\{\/\* ========================================================= \*\/\}\n\s*\{showSignatureModal && \(.*?\{\/\* ========================================================= \*\/\}\n\s*\{\/\* SEND EMAIL MODAL \*\/\}\n', '{/* ========================================================= */}\n      {/* SEND EMAIL MODAL */}\n', content, flags=re.DOTALL)

with open('d:\\Techi Nutpam files\\tn-hrms\\frontend\\src\\pages\\admin\\AdminInvoices.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
