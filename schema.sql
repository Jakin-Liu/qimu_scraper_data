-- 数据抓取任务管理系统数据库表结构
-- 创建时间: 2024年
-- 数据库: PostgreSQL (Neon)

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    urls TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    csv_url TEXT,
    error TEXT,
    remark TEXT
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- 为现有表添加备注字段（如果表已存在）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remark TEXT;

-- 创建数据抓取结果表
CREATE TABLE IF NOT EXISTS scraping_results (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    task_url TEXT NOT NULL,
    influencer_name VARCHAR(255),
    influencer_followers BIGINT,
    country_region VARCHAR(100),
    fastmoss_detail_url TEXT,
    product_sales_count INTEGER,
    product_sales_amount DECIMAL(15,2),
    influencer_id VARCHAR(255),
    sale_amount_show VARCHAR(100),
    raw_data JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_scraping_results_task_id ON scraping_results(task_id);
CREATE INDEX IF NOT EXISTS idx_scraping_results_status ON scraping_results(status);
CREATE INDEX IF NOT EXISTS idx_scraping_results_created_at ON scraping_results(created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_results_influencer_id ON scraping_results(influencer_id);

-- 添加表注释
COMMENT ON TABLE tasks IS '数据抓取任务表';
COMMENT ON COLUMN tasks.id IS '任务唯一标识符';
COMMENT ON COLUMN tasks.status IS '任务状态: pending(等待中), processing(处理中), completed(已完成), failed(失败)';
COMMENT ON COLUMN tasks.urls IS '要抓取的URL列表';
COMMENT ON COLUMN tasks.created_at IS '任务创建时间';
COMMENT ON COLUMN tasks.completed_at IS '任务完成时间';
COMMENT ON COLUMN tasks.csv_url IS '生成的CSV文件URL';
COMMENT ON COLUMN tasks.error IS '任务错误信息';

COMMENT ON TABLE scraping_results IS '数据抓取结果表';
COMMENT ON COLUMN scraping_results.id IS '结果记录唯一标识符';
COMMENT ON COLUMN scraping_results.task_id IS '关联的任务ID';
COMMENT ON COLUMN scraping_results.task_url IS '抓取的具体URL';
COMMENT ON COLUMN scraping_results.influencer_name IS '达人昵称';
COMMENT ON COLUMN scraping_results.influencer_followers IS '达人粉丝数';
COMMENT ON COLUMN scraping_results.country_region IS '国家/地区';
COMMENT ON COLUMN scraping_results.fastmoss_detail_url IS 'FastMoss达人详情页链接';
COMMENT ON COLUMN scraping_results.product_sales_count IS '该商品销量';
COMMENT ON COLUMN scraping_results.product_sales_amount IS '该商品销售额';
COMMENT ON COLUMN scraping_results.influencer_id IS '发布达人ID';
COMMENT ON COLUMN scraping_results.status IS '状态: active(活跃), inactive(非活跃), deleted(已删除)';
COMMENT ON COLUMN scraping_results.created_at IS '记录创建时间';
COMMENT ON COLUMN scraping_results.updated_at IS '记录更新时间';

-- 创建任务进度跟踪表
CREATE TABLE IF NOT EXISTS task_progress (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, url)
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_task_progress_task_id ON task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_status ON task_progress(status);
CREATE INDEX IF NOT EXISTS idx_task_progress_created_at ON task_progress(created_at);

-- 创建 TikTok 任务表
CREATE TABLE IF NOT EXISTS tiktok_tasks (
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    urls TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    csv_url TEXT,
    error TEXT,
    remark TEXT
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_tiktok_tasks_status ON tiktok_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tiktok_tasks_created_at ON tiktok_tasks(created_at);

-- 添加表注释
COMMENT ON TABLE tiktok_tasks IS 'TikTok 评论爬虫任务表';
COMMENT ON COLUMN tiktok_tasks.id IS '任务唯一标识符';
COMMENT ON COLUMN tiktok_tasks.status IS '任务状态: pending(等待中), processing(处理中), completed(已完成), failed(失败)';
COMMENT ON COLUMN tiktok_tasks.urls IS '要抓取的URL列表';
COMMENT ON COLUMN tiktok_tasks.created_at IS '任务创建时间';
COMMENT ON COLUMN tiktok_tasks.completed_at IS '任务完成时间';
COMMENT ON COLUMN tiktok_tasks.csv_url IS '生成的CSV文件URL';
COMMENT ON COLUMN tiktok_tasks.error IS '任务错误信息';
COMMENT ON COLUMN tiktok_tasks.remark IS '任务备注';

-- 创建 TikTok 子任务表（每个URL对应一个子任务）
CREATE TABLE IF NOT EXISTS tiktok_sub_tasks (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    product_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (task_id) REFERENCES tiktok_tasks(id) ON DELETE CASCADE
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_tiktok_sub_tasks_task_id ON tiktok_sub_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_sub_tasks_status ON tiktok_sub_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tiktok_sub_tasks_created_at ON tiktok_sub_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tiktok_sub_tasks_product_id ON tiktok_sub_tasks(product_id);

-- 添加表注释
COMMENT ON TABLE tiktok_sub_tasks IS 'TikTok 评论爬虫子任务表';
COMMENT ON COLUMN tiktok_sub_tasks.id IS '子任务唯一标识符';
COMMENT ON COLUMN tiktok_sub_tasks.task_id IS '关联的主任务ID';
COMMENT ON COLUMN tiktok_sub_tasks.url IS '商品URL';
COMMENT ON COLUMN tiktok_sub_tasks.product_id IS '商品ID';
COMMENT ON COLUMN tiktok_sub_tasks.status IS '子任务状态: pending(等待中), processing(处理中), completed(已完成), failed(失败)';
COMMENT ON COLUMN tiktok_sub_tasks.current_page IS '当前抓取页数';
COMMENT ON COLUMN tiktok_sub_tasks.total_pages IS '总页数';
COMMENT ON COLUMN tiktok_sub_tasks.total_reviews IS '已抓取评论总数';
COMMENT ON COLUMN tiktok_sub_tasks.started_at IS '开始时间';
COMMENT ON COLUMN tiktok_sub_tasks.completed_at IS '完成时间';
COMMENT ON COLUMN tiktok_sub_tasks.error_at IS '错误发生时间';
COMMENT ON COLUMN tiktok_sub_tasks.error_message IS '错误信息';

-- 创建 TikTok 评论数据表
CREATE TABLE IF NOT EXISTS tiktok_reviews (
    id SERIAL PRIMARY KEY,
    sub_task_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    -- 评论基本信息
    review_id VARCHAR(255),
    product_id VARCHAR(255),
    sku_id VARCHAR(255),
    product_name VARCHAR(500),
    -- 评论者信息
    reviewer_id VARCHAR(255),
    reviewer_name VARCHAR(255),
    reviewer_avatar_url TEXT,
    -- 评论内容
    review_rating INTEGER,
    review_text TEXT,
    review_images TEXT[],
    display_image_url TEXT,
    -- 评论元数据
    review_time BIGINT,
    review_time_parsed TIMESTAMP WITH TIME ZONE,
    review_country VARCHAR(10),
    sku_specification VARCHAR(500),
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_incentivized_review BOOLEAN DEFAULT FALSE,
    -- 保留字段（兼容旧数据）
    user_name VARCHAR(255),
    user_avatar TEXT,
    user_id VARCHAR(255),
    rating INTEGER,
    comment_text TEXT,
    comment_images TEXT[],
    comment_videos TEXT[],
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_time TIMESTAMP WITH TIME ZONE,
    -- 系统字段
    raw_data JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (sub_task_id) REFERENCES tiktok_sub_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tiktok_tasks(id) ON DELETE CASCADE
);

-- 创建唯一约束：task_id + sub_task_id + review_id 作为唯一键
-- 注意：由于 review_id 可能为 NULL，我们使用部分唯一索引
-- 但为了支持 ON CONFLICT，我们需要确保 review_id 不为 NULL 时才应用唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_tiktok_reviews_unique ON tiktok_reviews(task_id, sub_task_id, review_id) 
WHERE review_id IS NOT NULL;

-- 如果 review_id 可能为 NULL，我们需要在应用层处理唯一性
-- 或者创建一个包含所有情况的唯一约束（但这会导致 NULL 值的问题）
-- 由于 PostgreSQL 中 NULL 值在唯一约束中会被视为不同，我们需要使用部分唯一索引

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_sub_task_id ON tiktok_reviews(sub_task_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_task_id ON tiktok_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_product_id ON tiktok_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_review_id ON tiktok_reviews(review_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_sku_id ON tiktok_reviews(sku_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_reviewer_id ON tiktok_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_status ON tiktok_reviews(status);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_created_at ON tiktok_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_review_time_parsed ON tiktok_reviews(review_time_parsed);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_review_country ON tiktok_reviews(review_country);
CREATE INDEX IF NOT EXISTS idx_tiktok_reviews_user_id ON tiktok_reviews(user_id);

-- 添加表注释
COMMENT ON TABLE tiktok_reviews IS 'TikTok 商品评论数据表';
COMMENT ON COLUMN tiktok_reviews.id IS '评论记录唯一标识符';
COMMENT ON COLUMN tiktok_reviews.sub_task_id IS '关联的子任务ID';
COMMENT ON COLUMN tiktok_reviews.task_id IS '关联的主任务ID';
COMMENT ON COLUMN tiktok_reviews.review_id IS '评论ID';
COMMENT ON COLUMN tiktok_reviews.product_id IS '商品ID';
COMMENT ON COLUMN tiktok_reviews.sku_id IS 'SKU ID';
COMMENT ON COLUMN tiktok_reviews.product_name IS '商品名称';
COMMENT ON COLUMN tiktok_reviews.reviewer_id IS '评论者ID';
COMMENT ON COLUMN tiktok_reviews.reviewer_name IS '评论者昵称';
COMMENT ON COLUMN tiktok_reviews.reviewer_avatar_url IS '评论者头像URL';
COMMENT ON COLUMN tiktok_reviews.review_rating IS '评分(1-5星)';
COMMENT ON COLUMN tiktok_reviews.review_text IS '评论文本内容';
COMMENT ON COLUMN tiktok_reviews.review_images IS '评论图片URL列表';
COMMENT ON COLUMN tiktok_reviews.display_image_url IS '显示图片URL';
COMMENT ON COLUMN tiktok_reviews.review_time IS '评论时间(时间戳)';
COMMENT ON COLUMN tiktok_reviews.review_time_parsed IS '评论时间(解析后的时间戳)';
COMMENT ON COLUMN tiktok_reviews.review_country IS '评论国家代码';
COMMENT ON COLUMN tiktok_reviews.sku_specification IS 'SKU规格';
COMMENT ON COLUMN tiktok_reviews.is_verified_purchase IS '是否已验证购买';
COMMENT ON COLUMN tiktok_reviews.is_incentivized_review IS '是否激励评论';
COMMENT ON COLUMN tiktok_reviews.raw_data IS '原始数据JSON';
COMMENT ON COLUMN tiktok_reviews.status IS '状态: active(活跃), inactive(非活跃), deleted(已删除)';


