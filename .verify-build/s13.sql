-- ---------------------------------------------------------------------------
-- Self-signup fixtures (signup plan S13), hand-added
-- ---------------------------------------------------------------------------
--
-- c-020 trains on their own (trainer_id null) and t-020 is a coach who signed
-- up and has no clients yet, so DevQuickSignIn reaches both coachless paths.
-- Hand-written rather than regenerated: seed.mjs still reads the deleted
-- workoutSessions.json. The rows match src/mock-api (users.json clients +
-- otherCoaches, bodyMetrics.json, habits.json), which seed.mjs now reads too.
insert into users (id,role,name,email,avatar_url) values
('t-020','trainer','Ravi Menon','ravi.coach@example.com',''),
('c-020','client','Sam Okafor','sam.solo@example.com','https://i.pravatar.cc/240?img=12')
on conflict (id) do update set role=excluded.role,name=excluded.name,email=excluded.email,avatar_url=excluded.avatar_url;

insert into trainer_profiles (id,headline) values
('t-020','')
on conflict (id) do update set headline=excluded.headline;

insert into client_profiles (id,trainer_id,goal,height_cm,start_weight_kg,target_weight_kg,target_calories,target_protein,target_carbs,target_fat,joined_at,compliance_score,compliance_status,last_logged_at,compliance_streak_days) values
('c-020',null,'cut',178,86.4,80,2200,170,210,70,'2026-08-10',64,'yellow','2026-08-28T07:30:00.000Z',3)
on conflict (id) do update set trainer_id=excluded.trainer_id,goal=excluded.goal,height_cm=excluded.height_cm,start_weight_kg=excluded.start_weight_kg,target_weight_kg=excluded.target_weight_kg,target_calories=excluded.target_calories,target_protein=excluded.target_protein,target_carbs=excluded.target_carbs,target_fat=excluded.target_fat,joined_at=excluded.joined_at,compliance_score=excluded.compliance_score,compliance_status=excluded.compliance_status,last_logged_at=excluded.last_logged_at,compliance_streak_days=excluded.compliance_streak_days;

insert into body_metrics (id,client_id,date,weight_kg) values
('bm-00901','c-020','2026-08-10',86.4),
('bm-00902','c-020','2026-08-17',85.6),
('bm-00903','c-020','2026-08-24',85.1)
on conflict (id) do update set client_id=excluded.client_id,date=excluded.date,weight_kg=excluded.weight_kg;

insert into habits (id,client_id,title,icon,cadence,created_by) values
('h-0901','c-020','10k steps','walk','daily','client')
on conflict (id) do update set client_id=excluded.client_id,title=excluded.title,icon=excluded.icon,cadence=excluded.cadence,created_by=excluded.created_by;

insert into habit_completions (habit_id,date) values
('h-0901','2026-08-26'),
('h-0901','2026-08-27'),
('h-0901','2026-08-28')
on conflict (habit_id,date) do nothing;

