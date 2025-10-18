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


