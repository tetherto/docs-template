// Example of code that SHOULD be caught by validation

import { useEffect } from "react";

export function BadProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function logLayout() {
      const el = document.getElementById("nd-docs-layout");
      const cols = el ? getComputedStyle(el).gridTemplateColumns : "not found";
      
      // This is the problematic debug code that shipped
      fetch('http://127.0.0.1:7362/ingest/a2cc0272-9e81-4ccf-a05c-47c5f9c45b2d',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'X-Debug-Session-Id':'3b7f4a'
        },
        body:JSON.stringify({
          sessionId:'3b7f4a',
          runId:'post-fix',
          hypothesisId:'A',
          location:'provider.tsx:useEffect',
          message:'layout grid snapshot',
          data:{
            viewportWidth:window.innerWidth,
            gridTemplateColumns:cols
          },
          timestamp:Date.now()
        })
      }).catch(()=>{});
    }
    logLayout();
    window.addEventListener("resize", logLayout);
    return () => window.removeEventListener("resize", logLayout);
  }, []);
  
  return <>{children}</>;
}
