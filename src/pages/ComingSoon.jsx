import { Construction, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full w-40 h-40 transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 animate-pulse"></div>
        <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center relative z-10 border border-gray-100 rotate-12 transition-transform hover:rotate-0 duration-300">
          <Construction className="w-12 h-12 text-primary" />
        </div>
      </div>
      
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-4 relative">
        Coming Soon
        <Sparkles className="absolute -top-6 -right-8 w-6 h-6 text-amber-400 animate-bounce" />
      </h1>
      
      <p className="max-w-md text-lg text-gray-500 mb-8">
        We're currently working hard building this feature. It will be available in an upcoming update!
      </p>
      
      <Button 
        onClick={() => navigate(-1)} 
        variant="outline" 
        className="rounded-full px-8 h-12 shadow-sm hover:shadow-md transition-shadow group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Go Back
      </Button>
    </div>
  );
}
