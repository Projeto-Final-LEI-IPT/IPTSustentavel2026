// Importação do React e do ficheiro de estilos CSS específico para este componente
import React from 'react';
import '../styles/CopyrightModal.css';

// Definição do componente funcional CopyrightModal que recebe a propriedade onClose
// Esta propriedade é uma função que será executada quando o utilizador fechar o modal
const CopyrightModal = ({ onClose }) => {
    return (
        // Div exterior que funciona como sobreposição escura quando o modal está aberto
        <div className="modal-overlay">
            {/* Contentor principal do modal com o conteúdo */}
            <div className="copyright-modal">
                {/* Botão para fechar o modal no canto superior direito */}
                <button
                    className="close-modal"
                    onClick={onClose}
                    aria-label="Fechar modal"
                >
                    &times;
                </button>
                {/* Título do modal */}
                <h2>Informação de Copyright</h2>
                {/* Secção com o conteúdo principal do copyright */}
                <div className="copyright-content">
                    {/* Informação sobre o propósito do website */}
                    <p className="copyright-title-content" >
                        Website desenvolvido no ambito da unidade curricular de Projeto Final por:
                    </p>
                    {/* Secção de orientadores */}
                    <p className="copyright-title-content">
                        Orientadores:
                    </p>
                    <p>&emsp;Paulo Alexandre Gomes dos Santos</p>
                    <p>&emsp;Anabela Moreira</p>
                    {/* Secção de alunos */}
                    <p className="copyright-title-content" >
                        Alunos</p>
                    <p className="copyright-title-content">2024/2025</p>
                    <p>&emsp;Bárbara Andreia Arrabaça Martins Barbosa nº 19493</p>
                    <p>&emsp;Joana Teresa Duque Alves nº 14055</p>
                </div>
                {/* Secção de ações no fundo do modal */}
                <div className="modal-actions">
                    <button className="btn close" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

// Exportação do componente para ser utilizado noutros ficheiros da aplicação
export default CopyrightModal;
