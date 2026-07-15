import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

export function MonthPicker({ value, onChange, className }) {
  // value comes as YYYY-MM string
  let selectedDate = null;
  if (value) {
    const [y, m] = value.split('-');
    if (y && m) {
      selectedDate = new Date(y, m - 1, 1);
    }
  }

  const handleChange = (date) => {
    if (!date) {
      onChange('');
      return;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    onChange(`${y}-${m}`);
  };

  return (
    <div className={`relative flex items-center border border-gray-200 rounded-md bg-white px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-emerald-500 min-w-[140px] cursor-pointer ${className || ''}`}>
      <ReactDatePicker 
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="MM/yyyy"
        showMonthYearPicker
        placeholderText="Select month"
        className="w-full p-0 border-none bg-transparent focus:outline-none focus:ring-0 cursor-pointer text-gray-700"
        wrapperClassName="w-full"
      />
      <Calendar className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
    </div>
  );
}
