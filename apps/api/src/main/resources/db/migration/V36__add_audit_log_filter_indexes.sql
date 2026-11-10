CREATE INDEX idx_audit_log_action
    ON audit_log USING btree (action varchar_pattern_ops);

CREATE INDEX idx_audit_log_target
    ON audit_log USING btree (target_type, target_id);
