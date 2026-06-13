# Geração do Perfil de Comunicação de {{NOME}}

> Template de spec para gerar o perfil de comunicação de um criador.
> Substitua os placeholders antes de executar:
> - `{{NOME}}` — nome de exibição do criador (ex.: Micha Menezes)
> - `{{HANDLE}}` — @ do Instagram, sem o @ (ex.: michamenezes)
> - `{{N}}` — quantidade de melhores vídeos a baixar (ex.: 10)
> - `{{SLUG}}` — identificador curto para nomes de arquivo (ex.: michamenezes)

## Tarefas

### Fase 1: de obtenção dos dados

- [ ] Obter a lista de videos do Instagram da conta @{{HANDLE}} usando o MCP `resources/mcps/instagram-videos`
- [ ] Obter os {{N}} melhores videos do instagram da conta @{{HANDLE}} usando o MCP `resources/mcps/instagram-top-videos-download`
- [ ] Transcrever os vídeos usando o MCP `resources/mcps/video-transcription`

### Fase 2: análise das transcrições

- [ ] Dentro da pasta das transcrições executar a skill `.claude/skills/ig-analyze-hooks` e criar um arquivo para armazenar o resultado da análise em `ig-analyze-hooks.md`
- [ ] Dentro da pasta das transcrições executar a skill `.claude/skills/ig-analyze-retention` e criar um arquivo para armazenar o resultado da análise em `ig-analyze-retention.md`
- [ ] Dentro da pasta das transcrições executar a skill `.claude/skills/ig-analyze-storytelling` e criar um arquivo para armazenar o resultado da análise em `ig-analyze-storytelling.md`
- [ ] Dentro da pasta das transcrições executar a skill `.claude/skills/ig-analyze-vocabulary` e criar um arquivo para armazenar o resultado da análise em `ig-analyze-vocabulary.md`
- [ ] Gere o arquivo final de perfil de comunicação usando a skill `.claude/skills/ig-communication-profile` com base nas análises anteriores e salve no arquivo perfil-{{SLUG}}.md
