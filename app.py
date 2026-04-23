import streamlit as st
import os
from dotenv import load_dotenv
from utils.gemini_vision import adapt_image, parse_result
from utils.rag import build_query_engine, ask

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

st.set_page_config(page_title="Assistente para Dislexia", page_icon="📚", layout="centered")
st.title("📚 Assistente para Dislexia")
st.caption("Adapta exercícios escolares para uma leitura mais fácil")

if not API_KEY:
    st.error("Configure GEMINI_API_KEY no arquivo .env")
    st.stop()

# ETAPA 1 — Upload
st.markdown("## 1. Envie a foto do exercício")
uploaded = st.file_uploader("Escolha uma imagem (jpg, png, webp)", type=["jpg", "jpeg", "png", "webp"])

if uploaded:
    st.image(uploaded, caption="Seu exercício", use_container_width=True)

    if st.button("Adaptar para mim ✨", type="primary"):
        with st.spinner("Lendo e adaptando o exercício..."):
            result = adapt_image(uploaded.read(), API_KEY)
            st.session_state["adapted_raw"] = result
            st.session_state["engine"] = None
            st.session_state["qa_history"] = []
            st.session_state["show_tutor"] = False

# ETAPA 2 — Resultado adaptado
if st.session_state.get("adapted_raw"):
    original, adapted = parse_result(st.session_state["adapted_raw"])

    st.markdown("---")
    st.markdown("## 2. Versão adaptada para você 🎯")

    if original:
        with st.expander("Ver texto original extraído"):
            st.write(original)

    st.info(adapted)

    if not st.session_state.get("show_tutor"):
        if st.button("Tenho uma dúvida sobre isso 🤔"):
            st.session_state["show_tutor"] = True
            st.rerun()

# ETAPA 3 — Tutor RAG
if st.session_state.get("show_tutor"):
    st.markdown("---")
    st.markdown("## 3. Pergunte ao tutor 💬")

    if not st.session_state.get("engine"):
        with st.spinner("Preparando o tutor..."):
            st.session_state["engine"] = build_query_engine(
                st.session_state["adapted_raw"], API_KEY
            )

    with st.form("pergunta_form", clear_on_submit=True):
        question = st.text_input("O que você não entendeu?", placeholder="Ex: O que é fotossíntese?")
        submitted = st.form_submit_button("Perguntar 🚀")

    if submitted and question:
        with st.spinner("Pensando..."):
            answer = ask(st.session_state["engine"], question)
        st.session_state["qa_history"].append((question, answer))

    for q, a in reversed(st.session_state.get("qa_history", [])):
        st.markdown(f"**Você:** {q}")
        st.success(f"**Tutor:** {a}")
        st.markdown("")
