// Sahnelerdeki karakter çizimi değiştirilebilir: 1930'lar stili (HoseChar) ya da eski seri avatarı (Cizim1'deki OldChar).
// Aynı tenya sahneleri iki stilde de oynar; Cizim1Video stile göre sağlayıcıyı seçer.
import React, { createContext, useContext } from "react";
import { HoseChar, type HoseCharProps } from "../avatar2/Hose";

export const CharCtx = createContext<React.FC<HoseCharProps>>(HoseChar);
export const Who: React.FC<HoseCharProps> = (props) => {
  const Comp = useContext(CharCtx);
  return <Comp {...props} />;
};
