CREATE INDEX rate_limits_window ON rate_limits(window);
CREATE INDEX payment_claims_order ON payment_claims(order_id,created_at);
CREATE INDEX content_revisions_entity ON content_revisions(entity_type,entity_id,created_at);
CREATE INDEX audit_log_date ON audit_log(created_at);
