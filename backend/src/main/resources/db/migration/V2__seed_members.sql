insert into member (slug, name, theme_color, sort_order, is_admin) values
    ('kimdonguk',    '김동욱', '#6a4b85', 1, true),
    ('leejaeho',     '이재호', '#fdb837', 2, false),
    ('chohyunjun',   '조현준', '#463d45', 3, false),
    ('parkminhoon',  '박민훈', '#e45806', 4, false),
    ('choiseungbin', '최승빈', '#672e82', 5, false),
    ('kimchanghyun', '김창현', '#2d2e54', 6, false),
    ('kimdaehee',    '김대희', '#102e90', 7, false),
    ('jangikjun',    '장익준', '#cc1b1b', 8, false);

insert into dues_config (id, monthly_amount, initial_balance, bank_info, start_ym)
values (1, 30000, 0, null, to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM'));
