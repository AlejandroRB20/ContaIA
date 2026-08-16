-- EWO-005 Bloque E — Decision D-009: preservar la fecha local de expedicion
-- del CFDI sin inferir zona horaria.
--
-- El atributo `Fecha` de un CFDI 4.0 es la hora local del lugar de expedicion
-- y no incorpora offset (formato AAAA-MM-DDThh:mm:ss). Almacenarlo como
-- timestamptz obligaba a asumir una zona horaria implicita, produciendo un
-- instante dependiente del entorno que ejecuta el worker. Se conserva el
-- texto exacto en su lugar.
--
-- Migracion correctiva exclusiva: no edita ninguna migracion ya aplicada
-- (mismo principio de D-008).
--
-- SEGURIDAD DE DATOS: verificado mediante `SELECT COUNT(*) FROM cfdis` = 0
-- inmediatamente antes de generar esta migracion. Al no existir filas, la
-- clausula USING no evalua ningun valor: no se convierte ningun instante, no
-- se usa AT TIME ZONE, no se usa issued_at::text y no se asume UTC. Si esta
-- migracion se aplicara sobre una base con filas, la conversion NO seria
-- determinista y requeriria una decision explicita previa.
--
-- Se usa ALTER COLUMN ... TYPE en lugar de DROP + ADD COLUMN para conservar
-- la posicion ordinal de la columna fisica `issued_at`. PostgreSQL reconstruye
-- automaticamente el indice dependiente conservando su nombre
-- (`cfdis_company_id_issued_at_idx`), por lo que no se recrea manualmente.
-- La restriccion NOT NULL se preserva sin necesidad de redeclararla.

ALTER TABLE "cfdis"
ALTER COLUMN "issued_at" TYPE VARCHAR(19) USING NULL::VARCHAR(19);
