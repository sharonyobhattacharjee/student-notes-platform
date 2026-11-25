import {createContext,useContext,useEffect,useState} from "react";
import {api} from "./api";
const C=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!localStorage.getItem("token")){setLoading(false);return} api("/auth/me").then(d=>setUser(d.user)).catch(()=>{}).finally(()=>setLoading(false))},[]);
 const value={user,loading,login:(data)=>{localStorage.setItem("token",data.token);setUser(data.user)},setUser};
 return <C.Provider value={value}>{children}</C.Provider>}
export const useAuth=()=>useContext(C);
