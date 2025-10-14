import React, { useState, useEffect, useCallback } from 'react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  min,
  max,
  required = false,
  placeholder = "Select date and time",
  label,
  id,
  className = ""
}) => {
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');

  // Parse the datetime value when component mounts or value changes (avoid timezone conversions)
  useEffect(() => {
    if (value) {
      const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
      if (isoMatch) {
        const nextDate = isoMatch[1];
        const nextTime = isoMatch[2];
        if (nextDate !== dateValue) setDateValue(nextDate);
        if (nextTime !== timeValue) setTimeValue(nextTime);
      } else {
        // Fallback parsing if value is a full Date string
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          const nextDate = parsed.toISOString().split('T')[0];
          const nextTime = parsed.toTimeString().slice(0, 5);
          if (nextDate !== dateValue) setDateValue(nextDate);
          if (nextTime !== timeValue) setTimeValue(nextTime);
        }
      }
    } else {
      setDateValue('');
      setTimeValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Combine date and time when either changes, only emit if different from current value
  useEffect(() => {
    if (!dateValue && !timeValue) return;
    const combinedDateTime = `${dateValue || ''}T${timeValue || '09:00'}`.trim();
    if (combinedDateTime !== value) {
      onChange(combinedDateTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateValue, timeValue]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateValue(e.target.value);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeValue(e.target.value);
  };

  // Get minimum date (today) if not provided. If a datetime string is passed, extract the date portion
  const minDate = (min && min.includes('T') ? min.split('T')[0] : min) || new Date().toISOString().split('T')[0];

  return (
    <div className={`datetime-picker-container ${className}`}>
      {label && (
        <label htmlFor={id} className="datetime-picker-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      
      <div className="datetime-inputs">
        <div className="date-input-group">
          <div className="input-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <input
            id={id ? `${id}-date` : undefined}
            type="date"
            value={dateValue}
            onChange={handleDateChange}
            min={minDate}
            max={max}
            required={required}
            className="date-input"
            placeholder="Select date"
          />
        </div>
        
        <div className="time-input-group">
          <div className="input-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <input
            id={id ? `${id}-time` : undefined}
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="time-input"
            placeholder="Select time"
            step={60}
          />
        </div>
      </div>
      
      {dateValue && timeValue && (
        <div className="datetime-preview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span>
            {new Date(`${dateValue}T${timeValue}`).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
