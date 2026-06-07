// Contexto global de autenticação: armazena JWT e role (student | teacher)
import { createContext } from "react";

export const AuthContext = createContext(null);
