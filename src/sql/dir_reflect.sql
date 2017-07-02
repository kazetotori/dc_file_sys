USE `dc_file_sys`;


DROP TABLE IF EXISTS `t_dir_reflect`;
CREATE TABLE `t_dir-reflect`(
    `r_id` INT AUTO_INCREMENT,
    `group_no` INT NOT NULL,
    `pc_dir` VARCHAR(500) NOT NULL,
    `pc_token` CHAR(40) NOT NULL,
    `dir_name` VARCHAR(100) NOT NULL,
    `online-dir` CHAR(40) NOT NULL,
    `per_lv` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`r_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `t_dir_reflect` ADD UNIQUE(`online-dir`);