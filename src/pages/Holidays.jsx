import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Share2 } from "lucide-react";

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [filterMonth, setFilterMonth] = useState('All');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/holidays`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch holidays');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
          setHolidays(sorted);
        }
      })
      .catch(err => console.error("Error fetching holidays:", err));
  }, []);

  // Find the next upcoming holiday
  const today = new Date();
  const nextHoliday = holidays.find(h => new Date(h.date) >= today) || holidays[0];

  const getMonthAbbr = (dateString) => {
    return new Date(dateString).toLocaleString('default', { month: 'short' }).toUpperCase();
  };
  
  const getDayNum = (dateString) => {
    return new Date(dateString).getDate().toString().padStart(2, '0');
  };

  const getFullDateStr = (dateString) => {
    const d = new Date(dateString);
    const day = d.toLocaleString('default', { weekday: 'long' });
    const month = d.toLocaleString('default', { month: 'long' });
    const date = d.getDate();
    return `${day}, ${month} ${date}, ${d.getFullYear()}`;
  };

  const filteredHolidays = filterMonth === 'All' 
    ? holidays 
    : holidays.filter(h => getMonthAbbr(h.date) === filterMonth.toUpperCase());

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      
      {/* Left Sidebar */}
      <div className="w-full lg:w-80 space-y-6">
        
        {/* Next Holiday Card */}
        {nextHoliday && (
          <Card className="border border-gray-100 shadow-sm overflow-hidden text-center">
            <CardContent className="p-0">
              <div className="bg-primary/5 h-32 flex items-center justify-center relative">
                <div className="absolute -bottom-10 w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-md flex items-center justify-center">
                  <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80" alt="Festive" className="object-cover w-full h-full" />
                </div>
              </div>
              <div className="pt-14 pb-8 px-6 space-y-3">
                <p className="text-xs font-bold text-primary tracking-widest uppercase">Next Holiday</p>
                <h3 className="text-xl font-bold text-gray-900">{nextHoliday.name}</h3>
                <p className="text-gray-500 font-medium">{getFullDateStr(nextHoliday.date)}</p>
                
                <p className="text-sm text-gray-500 pt-4 pb-2">
                  Offices will remain closed. Teams are encouraged to celebrate with their families and friends. Wishing everyone a prosperous year ahead!
                </p>
                
                <Button variant="outline" className="w-full rounded-full text-primary border-primary/20 hover:bg-primary/5 mt-2">
                  View Policy details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Card */}
        <Card className="border-0 shadow-sm bg-gray-50">
          <CardContent className="p-6">
            <h4 className="text-sm font-bold text-gray-500 tracking-wider uppercase mb-4">Filter By Month</h4>
            <div className="flex flex-wrap gap-2">
              {['All', ...new Set(holidays.map(h => getMonthAbbr(h.date)))].map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMonth(m)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filterMonth === m 
                      ? 'bg-white text-primary shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:bg-gray-200/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Content - Annual List */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Annual List {new Date().getFullYear()}</h2>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
             Policy v2.4
          </Button>
        </div>

        <div className="space-y-4">
          {filteredHolidays.map(holiday => {
            const isRestricted = holiday.type === 'Optional';
            return (
              <Card key={holiday._id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center">
                  
                  {/* Date Block */}
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 shrink-0 mr-6">
                    <span className="text-xs font-bold text-gray-500">{getMonthAbbr(holiday.date)}</span>
                    <span className="text-xl font-extrabold text-primary">{getDayNum(holiday.date)}</span>
                  </div>
                  
                  {/* Holiday Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{holiday.name}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        isRestricted 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isRestricted ? 'Restricted Holiday' : 'Public Holiday'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(holiday.date).toLocaleString('default', { weekday: 'long' })} 
                      {holiday.type !== 'National' ? ' • Optional holiday as per policy' : ''}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-2 shrink-0">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary hover:bg-primary/5">
                      <CalendarDays className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary hover:bg-primary/5">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {filteredHolidays.length === 0 && (
            <div className="text-center py-12 text-gray-500 border border-dashed rounded-xl border-gray-200">
              No holidays found for the selected month.
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full mt-4 text-gray-600 border-dashed border-gray-300">
          Show Full Calendar Year
        </Button>
      </div>
    </div>
  );
}
