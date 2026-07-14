import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Calendar() {
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Fetch holidays
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/holidays`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch holidays');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setHolidays(data);
      })
      .catch(err => console.error("Error fetching holidays:", err));

    // Fetch user leaves
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo && userInfo.id) {
      fetch(`${import.meta.env.VITE_API_URL}/api/employee/leaves/${userInfo.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch leaves');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setLeaves(data);
        })
        .catch(err => console.error("Error fetching leaves:", err));
    }
  }, []);


  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonthDays = getDaysInMonth(year, month - 1);
  
  // Build calendar grid
  const days = [];
  
  // Padding for previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }
  
  // Padding for next month
  const totalCells = Math.ceil(days.length / 7) * 7;
  for (let i = 1; days.length < totalCells; i++) {
    days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
  }

  // Helper to find events for a specific date
  const getEventsForDate = (date) => {
    const events = [];
    
    // Check holidays
    const holiday = holidays.find(h => {
      const hd = new Date(h.date);
      return hd.getDate() === date.getDate() && hd.getMonth() === date.getMonth() && hd.getFullYear() === date.getFullYear();
    });
    if (holiday) {
      events.push({
        id: `h-${holiday._id}`,
        name: holiday.name,
        color: 'bg-purple-100 text-purple-700 border-purple-200'
      });
    }

    // Check leaves
    const leave = leaves.find(l => {
      const sd = new Date(l.startDate);
      const ed = new Date(l.endDate);
      return date >= sd && date <= ed && l.status === 'Approved';
    });
    if (leave) {
      events.push({
        id: `l-${leave._id}`,
        name: 'Your Approved Leave',
        color: 'bg-blue-100 text-blue-700 border-blue-200'
      });
    }


    return events;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Legend & Filter Bar */}
      <Card className="border-0 shadow-sm bg-gray-50/50">
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
            <span className="text-gray-400 font-bold tracking-widest text-xs uppercase mr-2">Legend</span>
            
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Your Approved Leave</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span>Public Holidays</span>
            </div>

          </div>
          
          <Button variant="ghost" className="text-primary font-semibold hover:bg-primary/5">
            Filter Events
          </Button>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Month Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b border-gray-100">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            &larr; Prev
          </Button>
          <h2 className="text-xl font-bold text-gray-900">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            Next &rarr;
          </Button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 border-l border-gray-100">
          {days.map((dayObj, i) => {
            const events = getEventsForDate(dayObj.date);
            const today = isToday(dayObj.date);
            
            return (
              <div 
                key={i} 
                className={`min-h-[120px] p-2 border-r border-b border-gray-100 transition-colors ${
                  !dayObj.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50/30'
                } ${today ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-200' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                    today 
                      ? 'bg-blue-500 text-white' 
                      : !dayObj.isCurrentMonth 
                        ? 'text-gray-400' 
                        : 'text-gray-700'
                  }`}>
                    {dayObj.day.toString().padStart(2, '0')}
                  </span>
                  
                  {today && (
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1 mr-1">
                      Today
                    </span>
                  )}
                </div>
                
                <div className="space-y-1.5 mt-2">
                  {events.map((event, idx) => (
                    <div 
                      key={idx} 
                      className={`text-[11px] font-semibold px-2 py-1 rounded border truncate flex items-center ${event.color}`}
                      title={event.name}
                    >
                      {event.icon && <span className="mr-1 text-xs">{event.icon}</span>}
                      {event.name}
                    </div>
                  ))}
                  

                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  );
}
