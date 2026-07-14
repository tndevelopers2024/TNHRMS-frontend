import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

export function DatePicker({ value, onChange, className, required, placeholder }) {
  // value comes as YYYY-MM-DD string from parent, we need to convert to Date object
  let selectedDate = null;
  if (value) {
    const [y, m, d] = value.split('-');
    if (y && m && d) {
      selectedDate = new Date(y, m - 1, d);
    }
  }

  const handleChange = (date) => {
    if (!date) {
      onChange('');
      return;
    }
    // format as YYYY-MM-DD to pass back to parent
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };

  return (
    <div className={`relative flex items-center border border-input rounded-xl bg-white px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${className || ''}`}>
      <ReactDatePicker 
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder || "dd/mm/yyyy"}
        required={required}
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        className="w-full p-0 border-none bg-transparent focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
        wrapperClassName="w-full"
      />
      <Calendar className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
    </div>
  );
}
