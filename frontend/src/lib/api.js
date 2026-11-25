export const API_URL=import.meta.env.VITE_API_URL||"http://localhost:3020/api";
export async function api(path,options={}){
 const headers=new Headers(options.headers||{});
 if(options.body && !(options.body instanceof FormData)) headers.set("Content-Type","application/json");
 const token=localStorage.getItem("token"); if(token) headers.set("Authorization",`Bearer ${token}`);
 const response=await fetch(`${API_URL}${path}`,{...options,headers});
 let data={}; try{data=await response.json()}catch{}
 if(response.status===401 && !path.includes("/auth/login")){localStorage.removeItem("token");}
 if(!response.ok) throw new Error(data.message||"Request failed");
 return data;
}
export function logout(){localStorage.removeItem("token");window.location.href="/login";}
