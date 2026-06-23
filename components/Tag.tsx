  interface TagProps {
    label: string;
  }

  const tagStyles: Record<string, string> = {
    'Not a Chain':
      'bg-emerald-100 text-emerald-800 border border-emerald-200',                                                      
    'Hidden Gem':
      'bg-amber-100 text-amber-800 border border-amber-200',                                                            
    'Local Favorite':                                                                                                   
      'bg-sky-100 text-sky-800 border border-sky-200',
    'Outdoor Seating':                                                                                                  
      'bg-lime-100 text-lime-800 border border-lime-200',
    'Family Friendly':                                                                                                  
      'bg-purple-100 text-purple-800 border border-purple-200',
    'Live Music':                                                                                                       
      'bg-rose-100 text-rose-800 border border-rose-200',
  };                                                                                                                    
   
  const defaultStyle = 'bg-gray-100 text-gray-600 border border-gray-200';                                              
                  
  export default function Tag({ label }: TagProps) {                                                                    
    const style = tagStyles[label] ?? defaultStyle;
    return (                                                                                                            
      <span       
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
      >                                                                                                                 
        {label}
      </span>                                                                                                           
    );            
  }
