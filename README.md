# 🏙️ **Comunidade Viva** — Plataforma de Engajamento Urbano

> **Status do Projeto:** 🚀 Em desenvolvimento para o DEV Weekend Challenge 2026.

---

## 📑 **Índice**
- [🎯 Visão Geral](#-visão-geral)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Arquitetura e Tecnologias](#-Arquitetura-e-Tecnologias)
- [💻 Demonstração](#-Demonstração-Técnica)
- [🚀 Instalação](#-Como-Executar-Clonar-o-Repositório)
- [⚖️ Licença](#-licença)

---

## 🎯 **Visão Geral**
A **Comunidade Viva** nasceu para combater o isolamento social em centros urbanos. Onde antes havia apenas vizinhos, agora existe um **ecossistema inteligente e participativo**.

> "Transformando a vizinhança em uma rede de colaboração em tempo real."

---

## ✨ **Funcionalidades**

* 📍 **Mapeamento de Incidentes**
    * Interface interativa para reporte de problemas (buracos, segurança, iluminação).
* 📅 **Gestão de Eventos**
    * Criação de mutirões, feiras e atividades locais.
* 🎮 **Motor de Gamificação**
    * Sistema de **ranking** e **insígnias** para recompensar cidadãos ativos.
* 🔔 **Notificações Inteligentes**
    * Alertas críticos baseados na sua **localização geográfica**.

---

## 🛠️ **Arquitetura e Tecnologias**

O projeto utiliza uma *stack* moderna focada em **performance** e **tipagem forte**:

| Tecnologia | Descrição |
| :--- | :--- |
| **Next.js 15** | Framework React para o Frontend |
| **TypeScript** | Superset JavaScript para segurança de código |
| **Prisma ORM** | Gerenciamento de banco de dados e migrações |
| **Docker** | Containerização do ambiente completo |

---

## 💻 **Demonstração Técnica**

Abaixo, a implementação da nossa **Classe Abstrata** para o sistema de recompensas, garantindo a integridade da lógica de autoridade do projeto:

```typescript
/**
 * @author Diogo Bruno Ferreira Martins de Aguiar (IFPB)
 * @description Lógica de Gamificação Protegida
 */

abstract class SistemaRecompensa {
  constructor(protected readonly nomeMedalha: string) {}

  // Método abstrato para implementação de critérios específicos
  abstract calcularBonus(pontosIniciais: number): number;

  public validarAtividade(): void {
    console.log(`[SISTEMA]: Validando conquista: ${this.nomeMedalha}`);
  }
}
```
🚀 Como ExecutarClonar o Repositório
```Bash
git clone [https://github.com/DiogoBAguiar/desafio-weeken-challenge.git](https://github.com/DiogoBAguiar/desafio-weeken-challenge.git)
```
Subir Ambiente com Docker
```Bash
docker-compose up --build
```
```AcessarAbra http://localhost:3000 no seu navegador.```
##📄 Licença e AutoriaEste 
projeto foi desenvolvido integralmente por Diogo Bruno Ferreira Martins de Aguiar,
graduando em Engenharia de Software no IFPB.

##Contato:

##GITHUB : diogobaguiar

##e-mail: diogo.bruno@academico.ifpb.edu.br

##📜 Licença: GNU General Public License v3.0 (GPL-3.0).Garantindo que a ideia permaneça aberta e a autoria seja sempre respeitada.


### 💡 Guia Rápido de Destaques (O que usei no código acima):

1.  **Títulos com Emojis:** Usei `#`, `##` e `###` seguidos de um emoji para facilitar a leitura visual.
2.  **Negrito (`**texto**`):** Serve para destacar palavras-chave no meio do parágrafo, atraindo o olhar do recrutador/juiz.
3.  **Citações (`>`):** Usei para a "Missão" do projeto. Isso cria uma barra vertical cinza que dá um destaque elegante.
4.  **Tabelas (`|`):** Ótimas para listar tecnologias ou dados de contato, deixando tudo alinhado.
5.  **Blocos de Código (` ``` `):** Com o nome da linguagem ao lado (ex: ` ```typescript `), o GitHub colore o código automaticamente.
6.  **Listas com Marcadores (`*` ou `-`):** Organiza as funcionalidades sem poluir a tela.
