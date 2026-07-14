import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, LayoutDashboard, Fingerprint } from "lucide-react"

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("userInfo", JSON.stringify(data));
        navigate("/dashboard");
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50 font-sans">
      {/* Left Side - Premium Branding */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden p-12">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/workspace-bg.png')" }}
        />
        
        {/* Colored Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-600/85 via-purple-600/85 to-indigo-900/90" />

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white blur-[120px]"></div>
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-300 blur-[100px]"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-between h-full w-full max-w-lg mx-auto text-white">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Company Logo" className="w-52 bg-white p-3 rounded-2xl backdrop-blur-md" />
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1]">
              Elevate your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">workforce</span> experience.
            </h1>
            <p className="text-indigo-100/90 text-lg leading-relaxed max-w-md font-medium">
              A comprehensive HRMS platform designed to simplify attendance, streamline leaves, and boost daily productivity.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-sm text-indigo-200/80 font-medium">
            <div className="flex -space-x-3">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alice&backgroundColor=e0e7ff" alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-600" />
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Bob&backgroundColor=e0e7ff" alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-600" />
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Charlie&backgroundColor=e0e7ff" alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-600" />
            </div>
            <p>Trusted by modern teams</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-6">
              <img src="/logo.png" alt="Company Logo" className="h-12" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="text-gray-500 font-medium">Please enter your details to sign in.</p>
          </div>
          
          <Card className="border-0 shadow-xl shadow-gray-200/40 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="p-4 text-sm text-rose-600 bg-rose-50/80 border border-rose-100 rounded-2xl flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 shrink-0"></div>
                    {error}
                  </div>
                )}
                
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-gray-700 font-semibold">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-700 font-semibold">Password</Label>
                    <a href="#" className="text-sm text-primary hover:text-primary/80 hover:underline font-medium transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-12 px-4 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-1">
                  <input type="checkbox" id="remember" className="rounded-md border-gray-300 text-primary focus:ring-primary w-4 h-4" />
                  <label htmlFor="remember" className="text-sm font-medium leading-none text-gray-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Remember me for 30 days
                  </label>
                </div>
                
                <Button type="submit" variant="gradient" className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 mt-2 flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>Sign in <Fingerprint className="w-4 h-4 opacity-70" /></>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Techie Nutpam. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
