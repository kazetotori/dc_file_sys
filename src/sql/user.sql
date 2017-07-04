USE `dc_file_sys`;



DROP TABLE IF EXISTS `t_user`;
CREATE TABLE `t_user`(
    `user_id` INT AUTO_INCREMENT,
    `group_no` INT NOT NULL,
    `username` CHAR(6) NOT NULL,
    `password` CHAR(40) NOT NULL,
    `is_admin` BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `t_user` ADD UNIQUE(`group_no`,`username`);



DROP TABLE IF EXISTS `t_group`;
CREATE TABLE `t_group`(
    `group_id` INT AUTO_INCREMENT,
    `group_name` CHAR(12) NOT NULL,
    PRIMARY KEY (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `t_group` ADD UNIQUE(`group_name`);



DROP TABLE IF EXISTS `t_sign`;
CREATE TABLE `t_sign`(
    `sign_id` INT AUTO_INCREMENT,
    `sign_token` CHAR(40) NOT NULL,
    `user_no` INT NOT NULL,
    `sign_ip` CHAR(30) NOT NULL,
    `sign_ts` BIGINT NOT NULL,
    PRIMARY KEY(`sign_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `t_sign` ADD COLUMN(``)
