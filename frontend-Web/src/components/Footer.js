import React, { useState } from 'react'; // Importação do React e do hook useState para gerir o estado
import '../styles/Footer.css'; // Importação dos estilos específicos para o rodapé
import logoIPT from '.././ipt.png'; // Importação do logótipo do Instituto Politécnico de Tomar
import CopyrightModal from './CopyrightModal'; // Importação do componente modal para exibição de informações de copyright

// Definição do componente funcional Footer
const Footer = () => {
  // Estado para controlar a exibição do modal de copyright
  // Inicialmente definido como falso (não visível)
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);

  return (
    // Elemento principal do rodapé
    <footer className="footer">
      <div className="footer-container"> {/* Contentor principal para organizar os elementos do rodapé */}
        <div className="footer-row"> {/* Linha para disposição horizontal dos elementos */}
          <div className="footer-column"> {/* Coluna para organização vertical dos elementos */}
            {/* Hiperligação para o site do IPT que abre numa nova janela */}
            <a href="https://www.ipt.pt" target="_blank" rel="noopener noreferrer" className="ipt-logo-link">
              <img src={logoIPT} alt="Logo IPT" className="ipt-logo" /> {/* Imagem do logótipo do IPT */}
            </a>           
            <p>©Instituto Politécnico de Tomar | Todos os direitos reservados | <span 
              className="copyright-link" 
              onClick={() => setShowCopyrightModal(true)} // Função que altera o estado para mostrar o modal quando clicado
            >Copyright</span></p> {/* Texto de copyright com elemento clicável */}
          </div>
        </div>
      </div>
      
      {/* Renderização condicional do modal de copyright */}
      {/* O modal só é exibido quando showCopyrightModal é verdadeiro */}
      {showCopyrightModal && (
        <CopyrightModal onClose={() => setShowCopyrightModal(false)} /> // Passa função de fecho para o modal
      )}
    </footer>
  );
};

export default Footer; // Exportação do componente para utilização noutros ficheiros
