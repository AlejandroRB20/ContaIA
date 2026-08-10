---
paths:
  - "**/*.{ts,tsx,js,jsx}"
  - "**/*.{spec,test}.ts"
  - "**/*.{spec,test}.tsx"
  - "docs/**/*.md"
---

# Calidad, pruebas y alcance

1. No eliminar, debilitar, saltar, marcar como pendiente ni alterar una prueba para ocultar una regresión. Si una prueba es incorrecta, explicar la evidencia y solicitar aprobación antes de cambiarla.
2. Ejecutar solo las validaciones proporcionales al alcance y reportar el comando, resultado y límites de cobertura. Una comprobación de formato no sustituye una validación funcional, de seguridad o de arquitectura.
3. Mantener cambios pequeños, revisables y dentro de la tarea. No hacer refactors oportunistas, cambios de dependencias o de UI fuera del alcance autorizado.
4. En frontend, respetar la identidad: logo oficial = icono con gráfica; el chatbot cuadrado con traje es exclusivo del asistente IA. Usar azul, blanco y tonos derivados; no presentarlo como logotipo.
5. Antes de declarar trabajo listo, revisar diff, estado Git, documentos de alcance y pruebas afectadas. Reportar cambios preexistentes por separado.
