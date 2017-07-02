USE `dc_file_sys`;


DROP TABLE IF EXISTS `t_log`;
CREATE TABLE `t_log`(
    `log_id` INT AUTO_INCREMENT,
    `log_title` VARCHAR(50) NOT NULL DEFAULT '',
    `log_msg` VARCHAR(500) NOT NULL DEFAULT '',
    `pcs_name` VARCHAR(50) NOT NULL DEFAULT '',
    `err_status` INT,
    `start_val` VARCHAR(500),
    `end_val` VARCHAR(500),
    `ins_date` CHAR(20) NOT NULL,
    PRIMARY KEY (`log_id`)
) Engine=InnoDB DEFAULT CHARSET=utf8;