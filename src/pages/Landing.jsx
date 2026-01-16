import { useState } from "react";
import LoginModal from "../components/LoginModal";

export default function Landing() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{css}</style>

      <section className="pw-hero">
        {/* Background */}
        <div className="pw-hero-bg" />
        <div className="pw-hero-overlay" />

        {/* Conteúdo */}
        <div className="pw-hero-inner">
          {/* HERO */}
          <div className="pw-hero-main">
            <span className="pw-brand">PlanWriter</span>

            <h1 className="pw-title">
              Escreva. Acompanhe. <span>Conclua.</span>
            </h1>

            <p className="pw-subtitle">
              O PlanWriter ajuda você a transformar pequenas sessões de escrita
              em progresso real — com metas claras, estatísticas visuais e constância.
            </p>

            <button className="pw-btn" onClick={() => setOpen(true)}>
              Começar a escrever
            </button>

            <div className="pw-hint">Gratuito para começar</div>
          </div>

          {/* BENEFÍCIOS */}
          <div className="pw-benefits">
            <div>
              <h3>Metas claras</h3>
              <p>
                Defina metas por projeto ou por mês e saiba exatamente
                onde quer chegar.
              </p>
            </div>
            <div>
              <h3>Progresso visível</h3>
              <p>
                Estatísticas, gráficos e histórico para acompanhar
                sua evolução.
              </p>
            </div>
            <div>
              <h3>Escrita em foco</h3>
              <p>
                Sem feed, sem rede social, sem distrações —
                apenas escrita.
              </p>
            </div>
          </div>

          <footer className="pw-footer">
            © {new Date().getFullYear()} PlanWriter
          </footer>
        </div>

       
        
      </section>

      <LoginModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const css = `
/* ===== BASE ===== */
:root{
  --ink:#0f172a;
  --muted:#475569;
  --accent:#4f46e5;
}

*{ box-sizing:border-box; }

/* ===== HERO ===== */
.pw-hero{
  position:relative;
  min-height:140vh;
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
}

.pw-hero-bg{
  position:absolute;
  inset:0;
  background-image:url("/assets/landing/hero-writing.png");
  background-size:cover;
  background-position:center;
  z-index:0;
  filter: saturate(1.50) contrast(1.50);
}

.pw-hero-overlay{
  position:absolute;
  inset:0;
  z-index:1;
  background: linear-gradient(
    to bottom,
    rgba(245,239,230,0),
    rgba(245,239,230,0.82)
  );
}


.pw-hero-inner{
  position:relative;
  z-index:2;
  max-width:1100px;
  width:100%;
  padding:80px 24px 48px;

  display:flex;
  flex-direction:column;
  align-items:center;
  gap:72px;
}

/* ===== HERO CONTENT ===== */
.pw-hero-main{
  max-width:760px;
  text-align:center;
}

.pw-brand{
  font-family:ui-serif,Georgia,serif;
  font-size:26px;
  display:block;
  margin-bottom:12px;
}

.pw-title{
  font-family:ui-serif,Georgia,serif;
  font-size:clamp(44px,6vw,72px);
  line-height:1.05;
  margin:0;
}

.pw-title span{
  color:var(--accent);
  font-style:italic;
}

.pw-subtitle{
  margin-top:16px;
  color:var(--muted);
  font-size:18px;
}

.pw-btn{
  margin-top:28px;
  padding:14px 28px;
  border:none;
  border-radius:12px;
  background:var(--accent);
  color:white;
  font-weight:600;
  cursor:pointer;
  box-shadow:0 14px 36px rgba(79,70,229,.35);
}

.pw-hint{
  margin-top:10px;
  font-size:14px;
  color:#64748b;
}

/* ===== BENEFÍCIOS ===== */
.pw-benefits{
  width:100%;
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:40px;
  padding-top:48px;
  border-top:1px solid rgba(15,23,42,.15);
  text-align:center;
}

.pw-benefits h3{
  font-size:22px;
  margin-bottom:8px;
}

.pw-benefits p{
  color:var(--muted);
  line-height:1.6;
}

/* ===== FLOATING CARDS ===== */
.pw-floating{
  position:absolute;
  z-index:3;
}

.pw-login{
  right:120px;
  bottom:200px;
}

.pw-mini{
  right:40px;
  bottom:120px;
}

.pw-card,
.pw-mini-card{
  background:white;
  border-radius:18px;
  padding:16px;
  box-shadow:0 30px 70px rgba(0,0,0,.25);
}

/* ===== FOOTER ===== */
.pw-footer{
  margin-top:24px;
  font-size:14px;
  color:var(--muted);
}

/* ===== RESPONSIVO ===== */
@media(max-width:900px){
  .pw-hero{ min-height:120vh; }
  .pw-benefits{ grid-template-columns:1fr; }
  .pw-floating{ display:none; }
}
`;
