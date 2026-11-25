import React, { useState, useEffect } from 'react';
import { 
  Car, IndianRupee, FileText, Trash2, CheckCircle, AlertTriangle, 
  ArrowRight, LayoutGrid, LogOut, Navigation, Clock, ShieldCheck, 
  Activity, XCircle, Info
} from 'lucide-react';

const MAX_SLOTS = 8;

// Premium, high-resolution car images for a realistic "camera feed" look
const MOCK_CAR_THUMBNAILS = [
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=400", // Blue sports
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400", // Red vintage
  "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=400", // White luxury
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400", // Grey classic
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=400", // Silver coupe
  "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=400", // White BMW
  "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&q=80&w=400", // Orange sports
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=400"  // Black performance
];

export default function App() {
  const [view, setView] = useState('home-view');
  const [isAdmin, setIsAdmin] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(20);
  
  // Parking State: Each bay can be null, or an object with a 'status' for animations
  const [parkingBays, setParkingBays] = useState(Array(MAX_SLOTS).fill(null));
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [bookingForm, setBookingForm] = useState({ name: '', plate: '' });
  
  // Custom Toast Notification State
  const [toasts, setToasts] = useState([]);

  const notify = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  const parkCar = (e) => {
    e.preventDefault();
    
    // Validation Rules
    const nameRegex = /^[a-zA-Z\s]{3,30}$/; // Only alphabets and spaces, 3 to 30 characters
    const plateRegex = /^[A-Za-z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Za-z]{1,2}[-\s]?[0-9]{4}$/; // Standard format: KA-01-AB-1234

    if (!bookingForm.name || !bookingForm.plate) {
        notify("Please fill in both Name and License Plate.", "error");
        return;
    }

    if (!nameRegex.test(bookingForm.name.trim())) {
        notify("Invalid Name. Please use only alphabets (min 3 characters).", "error");
        return;
    }

    if (!plateRegex.test(bookingForm.plate.trim())) {
        notify("Invalid Plate format. Please use standard format (e.g., KA-01-AB-1234).", "error");
        return;
    }

    const newCar = { 
      ...bookingForm, 
      id: Date.now(),
      plate: bookingForm.plate.toUpperCase().trim(),
      entryTime: new Date(),
      status: 'arriving', // Initial status for animation
      carImg: MOCK_CAR_THUMBNAILS[Math.floor(Math.random() * MOCK_CAR_THUMBNAILS.length)]
    };

    const emptyIndex = parkingBays.findIndex(b => b === null);
    
    if (emptyIndex !== -1) {
      // Slot available -> Start animation
      const updatedBays = [...parkingBays];
      updatedBays[emptyIndex] = newCar;
      setParkingBays(updatedBays);
      notify(`Gate opened for ${newCar.plate}. Entering Bay ${emptyIndex + 1}...`, "info");
      
      // Wait 1s for the slide-in animation, then set status to 'parked'
      setTimeout(() => {
        setParkingBays(current => {
            const settled = [...current];
            if (settled[emptyIndex] && settled[emptyIndex].id === newCar.id) {
                settled[emptyIndex] = { ...settled[emptyIndex], status: 'parked' };
            }
            return settled;
        });
        
        // Log to history immediately as "Active"
        setBookingHistory(prev => [{ ...newCar, status: 'Active', exitTime: '-', cost: '-' }, ...prev]);
      }, 1000);

    } else {
      // Lot is full -> Add to waitlist
      setWaitingQueue([...waitingQueue, newCar]);
      notify(`Lot Full! ${newCar.plate} added to waiting queue.`, "error");
    }
    setBookingForm({ name: '', plate: '' });
  };

  const vacateBay = (index) => {
    const carToLeave = parkingBays[index];
    if (!carToLeave) return;

    // 1. Start the departure animation
    const departingBays = [...parkingBays];
    departingBays[index] = { ...carToLeave, status: 'departing' };
    setParkingBays(departingBays);
    notify(`${carToLeave.plate} is leaving Bay ${index + 1}...`, "info");

    // 2. Wait for animation to finish (1 second), then clear the spot and check the queue
    setTimeout(() => {
        // Calculate billing
        const durationMins = Math.max(1, Math.floor((new Date() - carToLeave.entryTime) / 60000));
        const finalCost = ((durationMins / 60) * hourlyRate).toFixed(2);
        const exitTimeStr = new Date().toLocaleTimeString();

        // Update ledger to 'Completed'
        setBookingHistory(prev => prev.map(h => 
            h.id === carToLeave.id ? { ...h, status: 'Completed', exitTime: exitTimeStr, cost: finalCost, duration: durationMins } : h
        ));

        setParkingBays(currentBays => {
            const clearedBays = [...currentBays];
            clearedBays[index] = null; // Clear the spot

            // Auto-fill from FIFO queue if someone is waiting
            setWaitingQueue(currentQueue => {
                if (currentQueue.length > 0) {
                    const nextCar = currentQueue[0];
                    // Trigger arrival animation for the next car in this slot
                    clearedBays[index] = { ...nextCar, entryTime: new Date(), status: 'arriving' };
                    notify(`Waitlist vehicle ${nextCar.plate} is entering Bay ${index + 1}.`, "success");
                    
                    // Add new car to ledger
                    setBookingHistory(ph => [{ ...nextCar, entryTime: new Date(), status: 'Active', exitTime: '-', cost: '-' }, ...ph]);
                    
                    // Settle new car after 1 sec
                    setTimeout(() => {
                        setParkingBays(cb => {
                            const sb = [...cb];
                            if (sb[index] && sb[index].id === nextCar.id) sb[index] = { ...sb[index], status: 'parked' };
                            return sb;
                        });
                    }, 1000);

                    return currentQueue.slice(1); // Remove from queue
                }
                return currentQueue;
            });
            return clearedBays;
        });
    }, 1000);
  };

  return (
    <div className={`min-h-screen flex font-sans ${isAdmin ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Dynamic Toast Notification Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map(t => (
            <div key={t.id} className={`p-4 rounded-lg shadow-xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-right-8 fade-in text-white ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
                {t.type === 'success' ? <CheckCircle size={18}/> : t.type === 'error' ? <AlertTriangle size={18}/> : <Info size={18}/>}
                {t.message}
            </div>
        ))}
      </div>

      {/* Charcoal Sidebar Navigation */}
      <aside className="w-64 bg-[#1a1a1a] p-8 flex flex-col shrink-0 border-r border-[#333]">
        <h1 className="text-xl font-black mb-12 text-[#ffcc00] tracking-[0.2em] flex items-center gap-2">
            <LayoutGrid size={24} /> P-ALLOCATOR
        </h1>
        <ul className="space-y-2 text-xs font-black uppercase tracking-widest text-[#888]">
          {!isAdmin ? (
            <>
              <li className={`cursor-pointer p-4 rounded-lg transition-all ${view === 'home-view' ? 'text-[#ffcc00] bg-white/5' : 'hover:text-white hover:bg-white/5'}`} onClick={() => setView('home-view')}>Home</li>
              <li className={`cursor-pointer p-4 rounded-lg transition-all ${view === 'user-view' ? 'text-[#ffcc00] bg-white/5' : 'hover:text-white hover:bg-white/5'}`} onClick={() => setView('user-view')}>User Booking</li>
              <li className={`cursor-pointer p-4 rounded-lg transition-all ${view === 'login-view' ? 'text-[#ffcc00] bg-white/5' : 'hover:text-white hover:bg-white/5'}`} onClick={() => setView('login-view')}>Admin</li>
            </>
          ) : (
            <>
              <li className={`cursor-pointer p-4 rounded-lg transition-all ${view === 'admin-dash' ? 'text-[#ffcc00] bg-white/5' : 'hover:text-white hover:bg-white/5'}`} onClick={() => setView('admin-dash')}>Admin Home</li>
              <li className={`cursor-pointer p-4 rounded-lg transition-all ${view === 'cost-view' ? 'text-[#ffcc00] bg-white/5' : 'hover:text-white hover:bg-white/5'}`} onClick={() => setView('cost-view')}>Parking Cost</li>
              <li className={`cursor-pointer p-4 rounded-lg transition-all ${view === 'bookings-view' ? 'text-[#ffcc00] bg-white/5' : 'hover:text-white hover:bg-white/5'}`} onClick={() => setView('bookings-view')}>View Bookings</li>
              <li className="cursor-pointer p-4 rounded-lg text-red-500 hover:bg-red-500/10 transition-all mt-10 flex items-center gap-2" onClick={() => {setIsAdmin(false); setView('home-view');}}><LogOut size={16}/> Logout</li>
            </>
          )}
        </ul>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative">
        
        {/* VIEW: Public Home */}
        {view === 'home-view' && (
          <section className="h-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/40"></div>
            <div className="relative z-10 bg-[#ffcc00] text-black py-6 px-12 text-3xl md:text-4xl font-black uppercase tracking-widest shadow-2xl animate-in zoom-in duration-500">
                Online Parking Booking System
            </div>
          </section>
        )}

        {/* VIEW: Real-World User Terminal */}
        {view === 'user-view' && (
          <section className="p-10 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-10 border-b pb-6 border-slate-200">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">Terminal Gate</h1>
                    <p className="text-slate-500 font-medium mt-2">Real-time Bay Monitoring & Vehicle Check-in</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
                    <Activity size={18}/> Standard Rate: ₹{hourlyRate}/hr
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Check-in Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={parkCar} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 sticky top-10">
                        <h2 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-800">
                            <Navigation className="text-blue-600"/> Secure Entry
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Driver Name</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-800" placeholder="e.g. John Doe" value={bookingForm.name} onChange={e => setBookingForm({...bookingForm, name: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">License Plate</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono font-bold text-slate-800 transition-all" placeholder="KA-01-AB-1234" value={bookingForm.plate} onChange={e => setBookingForm({...bookingForm, plate: e.target.value})}/>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-xl font-black tracking-widest uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4">
                                Open Gate <ArrowRight size={18}/>
                            </button>
                        </div>

                        {waitingQueue.length > 0 && (
                            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2"><Clock size={14}/> Waitlist Active</h3>
                                <p className="text-sm font-bold text-amber-900">{waitingQueue.length} vehicle(s) in queue.</p>
                            </div>
                        )}
                    </form>
                </div>

                {/* Real-time Parking Grid with Lights and Animation */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {parkingBays.map((bay, i) => (
                        <div key={i} className={`bg-white rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden relative shadow-md ${bay ? 'border-slate-200' : 'border-dashed border-slate-300 hover:border-slate-400'}`}>
                            
                            {/* Bay Header with REAL TRAFFIC LIGHTS */}
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <span className="font-black text-slate-500 text-xs uppercase tracking-widest">Bay {i+1}</span>
                                {/* The Glow LED Indicator */}
                                <div className={`w-4 h-4 rounded-full shadow-lg ${bay ? 'bg-red-500 shadow-red-500/50 animate-pulse' : 'bg-green-500 shadow-green-500/50'}`}></div>
                            </div>
                            
                            {/* Visual Render Container */}
                            <div className="h-32 p-3 flex flex-col justify-center items-center bg-slate-50 relative overflow-hidden">
                                {bay ? (
                                    <div className={`absolute inset-0 p-3 flex flex-col transition-all duration-700 ease-in-out transform ${
                                        bay.status === 'arriving' ? 'translate-y-full opacity-0 scale-50' : 
                                        bay.status === 'departing' ? '-translate-y-full opacity-0 scale-50' : 
                                        'translate-y-0 opacity-100 scale-100'
                                    }`}>
                                        <img src={bay.carImg} className="h-16 w-full object-cover rounded-lg shadow-md mb-2" alt="Parked Car"/>
                                        <div className="bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-1 rounded mx-auto uppercase tracking-widest shadow-sm">
                                            {bay.plate}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-300">
                                        <Car size={36} strokeWidth={1.5}/>
                                        <span className="text-[10px] font-bold mt-2 uppercase tracking-widest">Available</span>
                                    </div>
                                )}
                            </div>

                            {/* Departure Control */}
                            <div className="p-3 bg-white border-t border-slate-100">
                                {bay ? (
                                    <button onClick={() => vacateBay(i)} disabled={bay.status !== 'parked'} className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 text-xs font-black py-2.5 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50">
                                        Vacate
                                    </button>
                                ) : (
                                    <div className="w-full bg-slate-100 text-slate-400 text-xs font-black py-2.5 rounded-lg text-center uppercase tracking-widest border border-slate-200">
                                        Empty
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
            </div>
          </section>
        )}

        {/* VIEW: Admin Home */}
        {view === 'admin-dash' && isAdmin && (
          <section className="h-screen flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center text-white">
            <div className="absolute inset-0 bg-black/40"></div>
            <div className="relative z-10 bg-white/95 text-slate-900 py-6 px-16 text-3xl font-black uppercase tracking-widest shadow-2xl mb-3 border-y-4 border-[#ffcc00]">
                Online Parking Booking System
            </div>
            <div className="relative z-10 bg-black/80 text-white font-mono font-bold uppercase tracking-widest px-6 py-2 rounded shadow-lg">
                www.jpinfotech.org
            </div>
          </section>
        )}

        {/* Admin - Parking Cost Setup */}
        {view === 'cost-view' && isAdmin && (
            <div className="p-10 animate-in fade-in">
                <div className="max-w-xl">
                    <h2 className="text-3xl font-black mb-2 text-white">Tariff Configuration</h2>
                    <p className="text-slate-400 mb-8">Update the global hourly billing rate applied to all future checkouts.</p>
                    
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Base Hourly Rate (₹)</label>
                        <div className="flex items-center gap-4">
                            <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all" />
                            <button onClick={() => notify("Tariff rate updated successfully!", "success")} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Admin - View Bookings Ledger (Enhanced Table) */}
        {view === 'bookings-view' && isAdmin && (
            <div className="p-10 animate-in fade-in max-w-7xl mx-auto">
                <h2 className="text-3xl font-black mb-2 text-white">Booking Audit Ledger</h2>
                <p className="text-slate-400 mb-8">Real-time overview of all current active sessions and completed transaction histories.</p>
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-400 font-black uppercase tracking-widest text-xs">
                                <tr>
                                    <th className="p-5 border-b border-slate-800">License Plate</th>
                                    <th className="p-5 border-b border-slate-800">Owner</th>
                                    <th className="p-5 border-b border-slate-800">Check-In</th>
                                    <th className="p-5 border-b border-slate-800">Check-Out</th>
                                    <th className="p-5 border-b border-slate-800">Billed Amount</th>
                                    <th className="p-5 border-b border-slate-800">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {bookingHistory.map((h, i) => (
                                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-5 font-mono font-bold text-white uppercase">{h.plate}</td>
                                        <td className="p-5 text-slate-300 font-medium">{h.name}</td>
                                        <td className="p-5 text-slate-400">{h.entryTime.toLocaleTimeString()}</td>
                                        <td className="p-5 text-slate-400">{h.exitTime}</td>
                                        <td className="p-5 font-mono text-emerald-400 font-bold">{h.cost === '-' ? '-' : `₹${h.cost}`}</td>
                                        <td className="p-5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                                h.status === 'Active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                            }`}>
                                                {h.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {bookingHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-slate-500 font-medium">No booking records found in the system ledger.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: Admin Login Form */}
        {view === 'login-view' && (
          <div className="h-screen flex items-center justify-center p-4">
            <div className="bg-white p-12 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 w-full max-w-md text-slate-900 animate-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                        <ShieldCheck size={32} className="text-slate-700"/>
                    </div>
                </div>
                <h2 className="text-2xl font-black mb-2 text-center">Admin Access</h2>
                <p className="text-center text-slate-500 text-sm mb-8">Enter your credentials to access the controller.</p>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Password</label>
                        <input type="password" id="pass" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-center tracking-widest font-mono text-xl" placeholder="••••" />
                    </div>
                    <button onClick={() => { 
                        if(document.getElementById('pass').value === '1234') {
                            setIsAdmin(true);
                            setView('admin-dash');
                            notify("Admin securely logged in.", "success");
                        } else {
                            notify("Invalid authentication password.", "error");
                        }
                    }} className="w-full bg-[#4CAF50] hover:bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">
                        Verify Login
                    </button>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}