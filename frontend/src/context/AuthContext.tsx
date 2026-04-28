import { createContext, useContext, useState, ReactNode } from "react"

interface UserData {
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: UserData | null
  token: string | null
  login: (userData: UserData, accessToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => {
    const stored = localStorage.getItem("user")
    return stored ? JSON.parse(stored) : null
  })

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"))

  function login(userData: UserData, accessToken: string) {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("token", accessToken)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem("user")
    localStorage.removeItem("token")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}