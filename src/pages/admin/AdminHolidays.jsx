import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Trash2 } from "lucide-react";

export default function AdminHolidays() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [holidays, setHolidays] = useState([]);
  
  // Form states
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('National');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHolidays = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/holidays`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch holidays');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setHolidays(data);
      })
      .catch(err => console.error("Error fetching holidays:", err));
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!name || !date) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, type })
      });
      if (res.ok) {
        setName('');
        setDate('');
        setType('National');
        setShowAddForm(false);
        fetchHolidays();
      } else {
        console.error("Failed to add holiday");
      }
    } catch (err) {
      console.error("Error adding holiday:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeHoliday = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/holidays/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHolidays(holidays.filter(h => h._id !== id));
      }
    } catch (err) {
      console.error("Error removing holiday:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Holiday Management</h1>
          <p className="text-muted-foreground mt-1">Add, edit, or remove company holidays.</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm ? "outline" : "gradient"}>
          {showAddForm ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Add Holiday</>}
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-0 shadow-sm animate-in slide-in-from-top-4 fade-in duration-300">
          <CardHeader>
            <CardTitle>Add New Holiday</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Holiday Name</Label>
                  <Input placeholder="e.g. Thanksgiving" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="National">National</option>
                    <option value="Optional">Optional</option>
                    <option value="Company Specific">Company Specific</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2 gap-2">
                <Button variant="outline" type="button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" className="px-8 shadow-md" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Holiday"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {holidays.map((holiday) => (
          <Card key={holiday._id} className="border-0 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-gray-900">{holiday.name}</h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                    {new Date(holiday.date).toLocaleDateString('en-GB')}
                  </div>
                  <span className="inline-block mt-2 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    {holiday.type}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => removeHoliday(holiday._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
