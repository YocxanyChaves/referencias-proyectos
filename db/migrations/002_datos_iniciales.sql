-- Catálogos iniciales.

insert into paises (nombre, codigo) values
  ('Costa Rica', 'CR'),
  ('Guatemala',  'GT'),
  ('Panamá',     'PA')
on conflict (codigo) do nothing;

insert into etiquetas (nombre) values
  ('MiPYMES'),
  ('Infraestructura'),
  ('Economía y comercio'),
  ('Política pública'),
  ('Equidad de género'),
  ('Energía'),
  ('Transformación organizacional'),
  ('Ambiente y cambio climático'),
  ('Transporte y movilidad'),
  ('Seguridad alimentaria y nutricional'),
  ('Salud'),
  ('Tecnología'),
  ('Derechos humanos'),
  ('Cooperación internacional')
on conflict (nombre) do nothing;
